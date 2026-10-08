import { useEffect, useState } from 'react';
import { Card, List, Button, Tag, Toast, TextArea, Modal } from 'antd-mobile';
import { myHomeworks, submitHomework } from '../api/parent';
import BottomTab from '../components/BottomTab';

/** 我的作业：查看并可提交（§4.7，家长/学员端提交） */
export default function HomeworkPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [target, setTarget] = useState<any>(null);
  const [content, setContent] = useState('');

  const load = async () => {
    try { setRows(await myHomeworks()); } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async () => {
    if (!target) return;
    await submitHomework(target.homeworkId, { studentId: target.studentId, content });
    Toast.show({ content: '提交成功' });
    setTarget(null); setContent('');
    load();
  };

  return (
    <div className="page">
      <div className="page-title">我的作业</div>
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((h, i) => (
          <Card key={`${h.homeworkId}_${h.studentId}_${i}`} style={{ marginBottom: 10 }}>
            <List>
              <List.Item>
                <div style={{ fontWeight: 600 }}>{h.title}</div>
                <div style={{ color: '#999', fontSize: 12 }}>学员ID {h.studentId}</div>
              </List.Item>
              {h.content && <List.Item>{h.content}</List.Item>}
              <List.Item extra={h.deadline ? new Date(h.deadline).toLocaleString() : '不限'}>
                截止
              </List.Item>
              <List.Item extra={
                h.submitted
                  ? <Tag color={h.isLate ? 'danger' : 'success'}>{h.isLate ? '已提交(逾期)' : '已提交'}</Tag>
                  : <Tag color="warning">待提交</Tag>
              }>
                状态
              </List.Item>
            </List>
            {!h.submitted && (
              <Button size="mini" color="primary" onClick={() => { setTarget(h); setContent(''); }}>
                提交作业
              </Button>
            )}
          </Card>
        )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无作业</div></Card>}
      </div>

      <Modal
        visible={!!target}
        title="提交作业"
        closeOnMaskClick
        onClose={() => setTarget(null)}
        closeOnAction
        onAction={(action) => (action.key === 'ok' ? onSubmit() : setTarget(null))}
        actions={[
          { key: 'cancel', text: '取消' },
          { key: 'ok', text: '提交', primary: true },
        ]}
        content={
          <div style={{ padding: 8 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{target?.title}</div>
            <TextArea
              placeholder="作业内容（可配合拍照/文件上传）"
              rows={4}
              value={content}
              onChange={setContent}
            />
          </div>
        }
      />
      <BottomTab />
    </div>
  );
}
