import { useState } from 'react';
import { Card, List, Button, Tag, Toast, Modal, TextArea } from 'antd-mobile';
import { listLeads, followLead } from '../../api/staff';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';

/** 顾问端线索跟进（§11.6 顾问端） */
export default function LeadsPage() {
  const [target, setTarget] = useState<any>(null);
  const [note, setNote] = useState('');
  const { data, loading, error, reload } = useApi(
    () => listLeads({ page: 1, size: 50 }),
  );
  const rows: any[] = data || [];

  const submitFollow = async () => {
    if (!note) { Toast.show({ content: '请填写跟进内容' }); return; }
    await followLead(target.id, { content: note });
    Toast.show({ content: '跟进已记录' });
    setTarget(null); setNote('');
    reload();
  };

  return (
    <div className="page">
      <div className="page-title">线索跟进</div>
      <div style={{ padding: 12 }}>
        <StateView loading={loading} error={error} onRetry={reload}>
          {rows.length ? rows.map((l) => (
            <Card key={l.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={<Tag color="primary">{l.status}</Tag>}>{l.name}</List.Item>
                <List.Item extra={l.phone || '-'}>手机号</List.Item>
              </List>
              <Button size="mini" color="primary" onClick={() => { setTarget(l); setNote(''); }}>
                添加跟进
              </Button>
            </Card>
          )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无线索</div></Card>}
        </StateView>
      </div>

      <Modal
        visible={!!target}
        title="添加跟进"
        closeOnMaskClick
        onClose={() => setTarget(null)}
        closeOnAction
        onAction={(a) => (a.key === 'ok' ? submitFollow() : setTarget(null))}
        actions={[{ key: 'cancel', text: '取消' }, { key: 'ok', text: '提交', primary: true }]}
        content={
          <div style={{ padding: 8 }}>
            <div style={{ marginBottom: 8 }}>{target?.name}</div>
            <TextArea placeholder="跟进内容" rows={4} value={note} onChange={setNote} />
          </div>
        }
      />
      <BottomTab />
    </div>
  );
}
