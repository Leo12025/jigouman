import { useEffect, useState } from 'react';
import { Card, List, Tag, Toast } from 'antd-mobile';
import { myConsumptions } from '../../api/parent';
import BottomTab from '../../components/BottomTab';

const ATT_LABEL: Record<string, { text: string; color: string }> = {
  PRESENT: { text: '出勤', color: 'success' },
  MAKEUP: { text: '补课', color: 'primary' },
  LEAVE: { text: '请假', color: 'warning' },
  ABSENT: { text: '缺勤', color: 'danger' },
  LATE: { text: '迟到', color: 'warning' },
};

/** 消课与考勤（§11.6 家长端「消课通知」） */
export default function ConsumptionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    myConsumptions().then(setRows).catch(() => Toast.show({ content: '加载失败' }));
  }, []);

  return (
    <div className="page">
      <div className="page-title">消课与考勤</div>
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((c) => {
          const att = c.attendance ? ATT_LABEL[c.attendance] : null;
          return (
            <Card key={c.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={att ? <Tag color={att.color}>{att.text}</Tag> : '-'}>
                  学员 {c.studentId}
                </List.Item>
                <List.Item extra={`${Math.abs(c.hours)} 课时`}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}
                </List.Item>
                <List.Item extra={`课次 ${c.lessonId ?? '-'}`}>课程 {c.courseId ?? '-'}</List.Item>
              </List>
            </Card>
          );
        }) : <Card><div style={{ padding: 12, color: '#999' }}>暂无消课记录</div></Card>}
      </div>
      <BottomTab />
    </div>
  );
}
