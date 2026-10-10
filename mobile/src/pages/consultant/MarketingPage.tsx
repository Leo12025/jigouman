import { useEffect, useState } from 'react';
import { Card, List, Button, Tag, Toast, Tabs, Input, Selector } from 'antd-mobile';
import {
  distributionStats,
  listDistributors,
  redeemGroupBuy,
  listCouponTemplates,
  grantCoupon,
  listStudents,
} from '../../api/staff';
import BottomTab from '../../components/BottomTab';

/** 顾问端：转介绍奖励 + 团购核销 + 优惠券发放（§4.28/§4.24/§4.17） */
export default function MarketingPage() {
  return (
    <div className="page">
      <div className="page-title">营销工具</div>
      <Tabs>
        <Tabs.Tab title="转介绍奖励" key="ref">
          <ReferralTab />
        </Tabs.Tab>
        <Tabs.Tab title="团购核销" key="gb">
          <RedeemTab />
        </Tabs.Tab>
        <Tabs.Tab title="优惠券发放" key="cp">
          <GrantTab />
        </Tabs.Tab>
      </Tabs>
      <BottomTab />
    </div>
  );
}

function ReferralTab() {
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    distributionStats().then(setStats).catch(() => undefined);
    listDistributors({ page: 1, size: 50 }).then((r) => setRows(r.list || [])).catch(() => setRows([]));
  }, []);
  return (
    <div style={{ padding: 12 }}>
      {stats && (
        <Card style={{ marginBottom: 12 }}>
          <div>分销员数：{stats.distributorCount ?? '-'}</div>
          <div>累计佣金：{stats.totalCommission ?? '-'}</div>
          <div>已结算：{stats.settledCommission ?? '-'}</div>
        </Card>
      )}
      <List header="分销员/转介绍">
        {rows.map((d) => (
          <List.Item key={d.id} extra={<Tag>{d.status || 'NORMAL'}</Tag>}>
            {d.name}（{d.phone || '-'}）
          </List.Item>
        ))}
        {!rows.length && <div style={{ color: '#999', padding: 12 }}>暂无</div>}
      </List>
    </div>
  );
}

function RedeemTab() {
  const [code, setCode] = useState('');
  const [res, setRes] = useState<any>(null);
  const onRedeem = async () => {
    if (!code) return Toast.show({ content: '请输入团购码' });
    const r = await redeemGroupBuy(code).catch((e) => {
      Toast.show({ content: '核销失败：' + (e?.response?.data?.message || '未知错误') });
      return null;
    });
    if (r) { setRes(r); Toast.show({ content: '核销成功' }); }
  };
  return (
    <div style={{ padding: 12 }}>
      <Input placeholder="输入团购码" value={code} onChange={setCode} />
      <Button color="primary" block style={{ marginTop: 8 }} onClick={() => { void onRedeem(); }}>核销</Button>
      {res && <Card style={{ marginTop: 12 }}>状态：{res.status}（拼团 #{res.teamId || res.id}）</Card>}
    </div>
  );
}

function GrantTab() {
  const [tpls, setTpls] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tplId, setTplId] = useState<number>();
  const [stuId, setStuId] = useState<number>();
  useEffect(() => {
    listCouponTemplates({ page: 1, size: 50 }).then((r) => setTpls(r.list || [])).catch(() => setTpls([]));
    listStudents({ page: 1, size: 50 }).then((r) => setStudents((r.list || r) as any[])).catch(() => setStudents([]));
  }, []);
  const onGrant = async () => {
    if (!tplId || !stuId) return Toast.show({ content: '请选择券模板与学员' });
    await grantCoupon({ templateId: tplId, studentId: stuId }).catch((e) =>
      Toast.show({ content: '发放失败：' + (e?.response?.data?.message || '') }),
    );
    Toast.show({ content: '已发放' });
  };
  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>券模板</div>
      <Selector
        options={tpls.map((t) => ({ label: t.name, value: t.id }))}
        value={tplId ? [tplId] : []}
        onChange={(v) => setTplId(v[0])}
      />
      <div style={{ margin: '12px 0 8px' }}>学员</div>
      <Selector
        options={students.map((s) => ({ label: s.name, value: s.id }))}
        value={stuId ? [stuId] : []}
        onChange={(v) => setStuId(v[0])}
      />
      <Button color="primary" block style={{ marginTop: 12 }} onClick={() => { void onGrant(); }}>发放优惠券</Button>
    </div>
  );
}
