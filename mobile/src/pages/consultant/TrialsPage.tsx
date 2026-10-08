import { useState } from 'react';
import { Card, List, Button, Input, Toast, Form } from 'antd-mobile';
import { listTrials, createTrial } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

/** 顾问端试听排期（§11.6） */
export default function TrialsPage() {
  const [leadId, setLeadId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  const loadTrials = async (id: number) => {
    const t = await listTrials(id).catch(() => []);
    setRows(t);
  };

  const submit = async () => {
    if (!leadId || !startTime) { Toast.show({ content: '请选择线索与时间' }); return; }
    await createTrial(Number(leadId), { startTime });
    Toast.show({ content: '试听已排期' });
    loadTrials(Number(leadId));
  };

  return (
    <div className="page">
      <div className="page-title">试听排期</div>
      <div style={{ padding: 12 }}>
        <Card>
          <Form layout="vertical">
            <Form.Item label="线索ID">
              <Input placeholder="线索ID" value={leadId} onChange={(v) => { setLeadId(v); if (v) loadTrials(Number(v)); }} />
            </Form.Item>
            <Form.Item label="试听时间">
              <Input type="datetime-local" value={startTime} onChange={setStartTime} />
            </Form.Item>
          </Form>
          <Button block color="primary" onClick={submit}>排期</Button>
        </Card>

        <div style={{ marginTop: 12 }}>
          {rows.length ? rows.map((t) => (
            <Card key={t.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={t.status || '-'}>
                  {t.startTime ? new Date(t.startTime).toLocaleString() : '-'}
                </List.Item>
              </List>
            </Card>
          )) : <Card><div style={{ padding: 12, color: '#999' }}>该线索暂无试听</div></Card>}
        </div>
      </div>
      <BottomTab />
    </div>
  );
}
