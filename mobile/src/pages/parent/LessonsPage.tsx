import { Card, List, Tag } from 'antd-mobile';
import { myLessons } from '../../api/parent';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';
import { PullRefresh } from '../../components/PullRefresh';

/** 我的课表（按绑定学员所在班级，§11.6 家长端） */
export default function LessonsPage() {
  const { data, loading, error, reload } = useApi(() => myLessons());
  const rows: any[] = data || [];

  return (
    <PullRefresh onRefresh={async () => reload()}>
      <div className="page">
      <div className="page-title">我的课表</div>
      <div style={{ padding: 12 }}>
        <StateView loading={loading} error={error} onRetry={reload}>
          {rows.length ? rows.map((l) => (
            <Card key={l.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={<Tag color="primary">{l.status}</Tag>}>
                  {l.startTime ? new Date(l.startTime).toLocaleString() : '-'}
                </List.Item>
                <List.Item extra={`班级 ${l.classGroupId ?? '-'}`}>课程 {l.courseId ?? '-'}</List.Item>
                {l.type === 'MAKEUP' && <List.Item extra={<Tag color="warning">补课</Tag>}>类型</List.Item>}
              </List>
            </Card>
          )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无课表</div></Card>}
        </StateView>
      </div>
      <BottomTab />
      </div>
    </PullRefresh>
  );
}
