import { useEffect, useState } from 'react';
import { Card, List, Toast, Tag } from 'antd-mobile';
import { myReviews } from '../../api/parent';
import BottomTab from '../../components/BottomTab';

/** 我的点评：老师课后点评（§6.6 / §11.6 家长端） */
export default function ReviewsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    myReviews().then(setRows).catch(() => Toast.show({ content: '加载点评失败' }));
  }, []);

  return (
    <div className="page">
      <div className="page-title">课后点评</div>
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((r) => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <List>
              <List.Item extra={r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}>
                学员ID {r.studentId}
              </List.Item>
              {r.rating ? <List.Item extra={<Tag color="success">{r.rating} 星</Tag>}>课堂表现</List.Item> : null}
            </List>
            <div style={{ padding: 12, whiteSpace: 'pre-wrap' }}>{r.content || '（无内容）'}</div>
            {r.aiGenerated ? <div style={{ padding: '0 12px 8px', color: '#999', fontSize: 12 }}>AI 生成（需人工复核）</div> : null}
          </Card>
        )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无点评</div></Card>}
      </div>
      <BottomTab />
    </div>
  );
}
