import { Card, List, Tag, Tabs } from 'antd-mobile';
import { myNotices, myRenewals } from '../../api/parent';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';

/** 我的通知 + 续费提醒（§6.6 / §11.6） */
export default function NoticesPage() {
  const { data: nd, loading: ln, error: en, reload: rn } = useApi(() => myNotices());
  const notices: any[] = nd || [];
  const { data: rd, loading: lr, error: er, reload: rr } = useApi(() => myRenewals());
  const renewals: any[] = rd || [];

  return (
    <div className="page">
      <div className="page-title">我的通知</div>
      <Tabs defaultActiveKey="notice">
        <Tabs.Tab title="通知" key="notice">
          <div style={{ padding: 12 }}>
            <StateView loading={ln} error={en} onRetry={rn}>
              {notices.length ? notices.map((n) => (
                <Card key={n.id} style={{ marginBottom: 10 }}>
                  <List>
                    <List.Item extra={<Tag color="primary">{n.type}</Tag>}>
                      {n.sendAt ? new Date(n.sendAt).toLocaleString() : '-'}
                    </List.Item>
                  </List>
                  <div style={{ padding: 12, fontWeight: 600 }}>{n.title}</div>
                  {n.content && <div style={{ padding: '0 12px 12px', whiteSpace: 'pre-wrap' }}>{n.content}</div>}
                </Card>
              )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无通知</div></Card>}
            </StateView>
          </div>
        </Tabs.Tab>
        <Tabs.Tab title={`续费提醒(${renewals.length})`} key="renewal">
          <div style={{ padding: 12 }}>
            <StateView loading={lr} error={er} onRetry={rr}>
              {renewals.length ? renewals.map((r) => (
                <Card key={r.id} style={{ marginBottom: 10 }}>
                  <List>
                    <List.Item extra={<Tag color="warning">{r.triggerType === 'LOW_HOURS' ? '课时不足' : '即将到期'}</Tag>}>
                      学员 {r.studentId}
                    </List.Item>
                    <List.Item extra={`${r.remainingHours ?? '-'} 课时`}>
                      {r.sentAt ? new Date(r.sentAt).toLocaleDateString() : '-'}
                    </List.Item>
                  </List>
                </Card>
              )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无续费提醒</div></Card>}
            </StateView>
          </div>
        </Tabs.Tab>
      </Tabs>
      <BottomTab />
    </div>
  );
}
