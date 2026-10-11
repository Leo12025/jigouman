import { Card, List, Button, Tag, Toast } from 'antd-mobile';
import { listTasks, completeTask } from '../../api/staff';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';
import { PullRefresh } from '../../components/PullRefresh';

const TYPE_LABEL: Record<string, string> = {
  AFTER_CLASS_REVIEW: '课后点评',
};

/** 老师端待办中心（§4.26 / §11.6：点评/批改等逾期聚合提醒） */
export default function TasksPage() {
  const { data, loading, error, reload } = useApi(
    () => listTasks({ status: 'TODO', page: 1, size: 50 }),
  );
  const rows: any[] = data || [];

  const onComplete = async (id: number) => {
    await completeTask(id);
    Toast.show({ content: '已完成' });
    reload();
  };

  return (
    <PullRefresh onRefresh={async () => reload()}>
      <div className="page">
      <div className="page-title">待办中心</div>
      <div style={{ padding: 12 }}>
        <StateView loading={loading} error={error} onRetry={reload}>
          {rows.length ? rows.map((t) => (
            <Card key={t.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={<Tag color="warning">{TYPE_LABEL[t.type] || t.type}</Tag>}>
                  {t.title}
                </List.Item>
                <List.Item extra={t.dueAt ? new Date(t.dueAt).toLocaleString() : '-'}>
                  截止
                </List.Item>
              </List>
              <Button size="mini" color="primary" onClick={() => onComplete(t.id)}>标记完成</Button>
            </Card>
          )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无待办</div></Card>}
        </StateView>
      </div>
      <BottomTab />
      </div>
    </PullRefresh>
  );
}
