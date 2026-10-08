import { useEffect, useState } from 'react';
import { Card, List, Toast, Tag } from 'antd-mobile';
import { myLessons } from '../../api/parent';
import BottomTab from '../../components/BottomTab';

/** 我的课表（按绑定学员所在班级，§11.6 家长端） */
export default function LessonsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    myLessons().then(setRows).catch(() => Toast.show({ content: '加载课表失败' }));
  }, []);

  return (
    <div className="page">
      <div className="page-title">我的课表</div>
      <div style={{ padding: 12 }}>
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
      </div>
      <BottomTab />
    </div>
  );
}
