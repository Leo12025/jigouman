import { useEffect, useState } from 'react';
import { Card, List, Button, Tag, Toast, Modal, Input, TextArea } from 'antd-mobile';
import { listHomeworks, getHomework, reviewHomework } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

/** 老师端作业批改（§11.6） */
export default function HomeworkPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');

  const load = () => listHomeworks({ page: 1, size: 50 })
    .then((r) => setRows(r.list || r)).catch(() => Toast.show({ content: '加载作业失败' }));
  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    const d = await getHomework(id);
    setDetail(d);
  };

  const submitReview = async () => {
    await reviewHomework(target.id, {
      score: score ? Number(score) : undefined,
      comment: comment || undefined,
      isExcellent: Number(score) >= 90 ? 1 : 0,
    });
    Toast.show({ content: '批改完成' });
    setTarget(null); setScore(''); setComment('');
    if (detail) setDetail(await getHomework(detail.id));
    load();
  };

  return (
    <div className="page">
      <div className="page-title">作业批改</div>
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((h) => (
          <Card key={h.id} style={{ marginBottom: 10 }}>
            <List>
              <List.Item>{h.title}</List.Item>
              <List.Item extra={`班级 ${h.classGroupId ?? '-'}`}>
                {h.deadline ? new Date(h.deadline).toLocaleDateString() : '不限截止'}
              </List.Item>
            </List>
            <Button size="mini" color="primary" onClick={() => openDetail(h.id)}>查看提交</Button>
          </Card>
        )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无作业</div></Card>}

        {detail && (
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>提交记录：{detail.title}</div>
            {(detail.submits || []).length ? detail.submits.map((s: any) => (
              <Card key={s.id} style={{ marginBottom: 8, background: '#fafafa' }}>
                <div>学员 {s.studentId}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{s.content || '（无内容）'}</div>
                <div style={{ marginTop: 4 }}>
                  {s.review?.score != null
                    ? <Tag color="success">已批改 {s.review.score} 分</Tag>
                    : <Tag color="warning">待批改</Tag>}
                </div>
                <Button size="mini" onClick={() => { setTarget(s); setScore(s.review?.score ?? ''); setComment(s.review?.comment ?? ''); }}>
                  {s.review ? '修改' : '批改'}
                </Button>
              </Card>
            )) : <div style={{ color: '#999' }}>暂无提交</div>}
          </Card>
        )}
      </div>

      <Modal
        visible={!!target}
        title="批改"
        closeOnMaskClick
        onClose={() => setTarget(null)}
        closeOnAction
        onAction={(a) => (a.key === 'ok' ? submitReview() : setTarget(null))}
        actions={[{ key: 'cancel', text: '取消' }, { key: 'ok', text: '提交', primary: true }]}
        content={
          <div style={{ padding: 8 }}>
            <Input placeholder="得分" value={score} onChange={setScore} />
            <div style={{ height: 8 }} />
            <TextArea placeholder="评语" rows={3} value={comment} onChange={setComment} />
          </div>
        }
      />
      <BottomTab />
    </div>
  );
}
