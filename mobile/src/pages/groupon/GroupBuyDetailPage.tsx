import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, List, Button, Tag, Input, Toast } from 'antd-mobile';
import { getList, getToken, getRole } from '../../api/client';
import { myStudents } from '../../api/parent';
import {
  getPublicActivity, listPublicOpenTeams, listPublicTeamMembers,
  createPublicTeam, joinPublicTeam, createPublicShowoff, myPublicTeams, trackGroupBuy,
} from '../../api/groupon';

/** 匿名访客标识：便于过程数据统计（分享裂变溯源） */
function visitorId(): string {
  let v = localStorage.getItem('gb_visitor');
  if (!v) {
    v = 'v' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('gb_visitor', v);
  }
  return v;
}

function shareLink(activityId: number): string {
  const base = window.location.origin + (window.location.pathname.startsWith('/m') ? '/m/' : '/');
  return `${base}#/groupon/${activityId}`;
}

export default function GroupBuyDetailPage() {
  const { id } = useParams();
  const activityId = Number(id);
  const navigate = useNavigate();

  const [act, setAct] = useState<any>(null);
  const [openTeams, setOpenTeams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [showoffTeamId, setShowoffTeamId] = useState<number | null>(null);
  const [showoffContent, setShowoffContent] = useState('');
  const [busy, setBusy] = useState(false);

  const isParent = getToken() && getRole() === 'parent';

  const load = () => {
    getPublicActivity(activityId)
      .then((a: any) => { setAct(a); return a; })
      .then(() => listPublicOpenTeams(activityId, 20))
      .then((t: any) => setOpenTeams(Array.isArray(t) ? t : []))
      .catch(() => { setAct(null); });
  };

  useEffect(() => {
    load();
    trackGroupBuy({ activityId, type: 'VIEW', visitorId: visitorId() });
    // 家长登录态：预填学员
    if (isParent) {
      getList(myStudents()).then((ss: any[]) => {
        setStudents(ss);
        if (ss[0]) setStudentId(ss[0].id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const refreshMine = () => {
    if (!studentId) return;
    myPublicTeams(studentId).then((t: any) => setMyTeams(Array.isArray(t) ? t : [])).catch(() => setMyTeams([]));
  };
  useEffect(() => { refreshMine(); /* eslint-disable-next-line */ }, [studentId]);

  const ensureStudent = (): number | null => {
    if (!studentId) {
      Toast.show({ content: isParent ? '请选择学员' : '请输入学员ID' });
      return null;
    }
    return studentId;
  };

  const onOpen = async () => {
    const sid = ensureStudent();
    if (sid == null) return;
    setBusy(true);
    try {
      const r: any = await createPublicTeam({ activityId, leaderStudentId: sid, visitorId: visitorId() });
      Toast.show({ content: '开团成功，请完成支付' });
      trackGroupBuy({ activityId, type: 'TEAM_OPEN', teamId: r?.team?.id, studentId: sid, visitorId: visitorId() });
      refreshMine();
    } catch { /* 错误提示由请求层统一处理 */ } finally { setBusy(false); }
  };

  const onJoin = async (joinCode?: string) => {
    const sid = ensureStudent();
    if (sid == null) return;
    const c = (joinCode || code || '').trim();
    if (!c) { Toast.show({ content: '请输入拼团码' }); return; }
    setBusy(true);
    try {
      await joinPublicTeam({ code: c, studentId: sid, visitorId: visitorId() });
      Toast.show({ content: '参团成功，请完成支付' });
      setCode('');
      load();
      refreshMine();
    } catch { /* 错误提示由请求层统一处理 */ } finally { setBusy(false); }
  };

  const onShare = () => {
    trackGroupBuy({ activityId, type: 'SHARE', visitorId: visitorId() });
    const link = shareLink(activityId);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => Toast.show({ content: '链接已复制，去微信分享好友吧' }))
        .catch(() => Toast.show({ content: link }));
    } else {
      Toast.show({ content: link });
    }
  };

  const onShowoff = async () => {
    if (!showoffTeamId) { Toast.show({ content: '请选择拼团' }); return; }
    if (!showoffContent.trim()) { Toast.show({ content: '请输入晒单内容' }); return; }
    await createPublicShowoff({ teamId: showoffTeamId, studentId, content: showoffContent.trim() })
      .catch(() => undefined);
    Toast.show({ content: '晒单已发布' });
    setShowoffContent(''); setShowoffTeamId(null);
  };

  const tiers = useMemo(() => (act?.tiers || []) as any[], [act]);

  if (act === null) {
    return (
      <div className="page">
        <div className="page-title" onClick={() => navigate('/groupon')}>拼团详情</div>
        <Card style={{ marginTop: 16, textAlign: 'center', color: '#999' }}>活动不存在或已下架</Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/groupon')}>返回</span>
        <span>拼团详情</span>
        <span onClick={onShare} style={{ color: '#1677ff' }}>分享</span>
      </div>

      <Card>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{act.name}</div>
        <div style={{ marginTop: 8 }}>
          <span style={{ color: '#f50', fontSize: 22, fontWeight: 700 }}>¥{Number(act.price || 0).toFixed(2)}</span>
          {act.leaderPrice != null && (
            <Tag color="gold" style={{ marginLeft: 8 }}>团长价 ¥{Number(act.leaderPrice).toFixed(2)}</Tag>
          )}
        </div>
        <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
          {act.groupSize} 人成团 · 成团发 {act.hours || 0} 课时
          {act.teamValidHours ? ` · 开团后 ${act.teamValidHours}h 内成团` : ''}
        </div>
        {tiers.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>阶梯团（人越多越便宜）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tiers.map((t: any) => (
                <Tag key={t.id} color="blue">{t.minSize}人 ¥{Number(t.price).toFixed(2)}</Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 学员身份（开团/参团需要） */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>参团学员</div>
        {isParent ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {students.map((s) => (
              <Button
                key={s.id} size="mini" fill={studentId === s.id ? 'solid' : 'outline'}
                color={studentId === s.id ? 'primary' : 'default'}
                onClick={() => setStudentId(s.id)}
              >{s.name}</Button>
            ))}
            {!students.length && <span style={{ color: '#999' }}>暂无绑定学员</span>}
          </div>
        ) : (
          <Input
            placeholder="输入学员ID（家长登录可自动选择）"
            value={studentId == null ? '' : String(studentId)}
            onChange={(v) => setStudentId(v ? Number(v) : null)}
            type="number"
          />
        )}
        <Button color="primary" block style={{ marginTop: 10 }} loading={busy} onClick={onOpen}>
          我要开团（享团长价）
        </Button>
      </Card>

      {/* 参与拼团：凑团列表 + 拼团码 */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>参与拼团（还差几人）</div>
        <List>
          {openTeams.map((t) => (
            <List.Item
              key={t.teamId}
              extra={<Button size="mini" color="primary" onClick={() => onJoin(t.code)}>参团</Button>}
            >
              <div>团长 #{t.leaderStudentId}</div>
              <div style={{ color: '#999', fontSize: 12 }}>已 {t.currentSize} 人 · 还差 <b style={{ color: '#f50' }}>{t.need}</b> 人</div>
            </List.Item>
          ))}
          {!openTeams.length && <div style={{ color: '#999', padding: 8 }}>暂无进行中的团，开个新团吧</div>}
        </List>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input placeholder="或输入拼团码" value={code} onChange={setCode} />
          <Button color="primary" onClick={() => onJoin()}>参团</Button>
        </div>
      </Card>

      {/* 我的拼团 */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>我的拼团</div>
        <List>
          {myTeams.map((t) => (
            <List.Item
              key={t.id}
              extra={<Tag color={
                t.status === 'SUCCESS' ? 'green' : t.status === 'REDEEMED' ? 'blue' : t.status === 'INVALID' ? 'red' : 'gold'
              }>{t.status}</Tag>}
              onClick={() => listPublicTeamMembers(t.id).then(() => undefined)}
            >
              <div>{t.activity?.name || '拼团'}</div>
              <div style={{ color: '#999', fontSize: 12 }}>团码 {t.code} · {t.currentSize}/{act.groupSize} 人</div>
            </List.Item>
          ))}
          {!myTeams.length && <div style={{ color: '#999', padding: 8 }}>还没有参团记录</div>}
        </List>
        {/* 晒单（已成团的团可买家秀） */}
        {myTeams.some((t) => t.status === 'SUCCESS' || t.status === 'REDEEMED') && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>发布晒单（买家秀）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {myTeams.filter((t) => t.status === 'SUCCESS' || t.status === 'REDEEMED').map((t) => (
                <Button
                  key={t.id} size="mini" fill={showoffTeamId === t.id ? 'solid' : 'outline'}
                  color={showoffTeamId === t.id ? 'primary' : 'default'}
                  onClick={() => setShowoffTeamId(t.id)}
                >{t.code}</Button>
              ))}
            </div>
            <Input placeholder="说点拼团体验…" value={showoffContent} onChange={setShowoffContent} />
            <Button block style={{ marginTop: 6 }} onClick={onShowoff}>发布晒单</Button>
          </div>
        )}
      </Card>
      <div style={{ height: 24 }} />
    </div>
  );
}
