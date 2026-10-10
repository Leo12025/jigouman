import { useEffect, useState } from 'react';
import { Card, List, Button, Tag, Toast } from 'antd-mobile';
import { staffProfile, listLessons, attendanceClock, listAttendance } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

/** 老师端：个人排班考勤 + 打卡任务（§11.6） */
export default function SchedulePage() {
  const [me, setMe] = useState<number | null>(null);
  const [clocks, setClocks] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    staffProfile()
      .then((p) => {
        setMe(p.id);
        refresh(p.id);
      })
      .catch(() => Toast.show({ content: '获取身份信息失败' }));
  }, []);

  const refresh = async (teacherId: number) => {
    const [att, ls] = await Promise.all([
      listAttendance(teacherId).catch(() => ({ list: [] })),
      listLessons({ teacherId, page: 1, size: 50 }).catch(() => ({ list: [], rows: [] })),
    ]);
    setClocks(att.list || []);
    const rows: any[] = (att as any).rows ? (att as any).rows : (ls.list || []);
    setLessons(rows);
  };

  const doClock = async (type: 'IN' | 'OUT', lessonId?: number) => {
    if (!me) return;
    await attendanceClock({ teacherId: me, type, lessonId }).catch(() => Toast.show({ content: '打卡失败' }));
    Toast.show({ content: '已打卡' });
    refresh(me);
  };

  return (
    <div className="page">
      <div className="page-title">排班打卡</div>
      <div style={{ padding: 12 }}>
        <Card title="今日打卡" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Button color="primary" size="small" onClick={() => doClock('IN')}>上班打卡</Button>
            <Button size="small" onClick={() => doClock('OUT')}>下班打卡</Button>
          </div>
          {clocks.length ? (
            <List>
              {clocks.map((c) => (
                <List.Item key={c.id} extra={<Tag color={c.type === 'IN' ? 'green' : 'default'}>{c.type}</Tag>}>
                  {c.date} {c.remark || ''}
                </List.Item>
              ))}
            </List>
          ) : <div style={{ color: '#999' }}>今日暂无打卡记录</div>}
        </Card>

        <Card title="我的排班（课次）">
          {lessons.length ? (
            <List>
              {lessons.map((l) => (
                <List.Item
                  key={l.id}
                  description={`${l.startTime || ''} ${l.courseName || ''}`}
                  extra={<Button size="mini" color="primary" onClick={() => doClock('IN', l.id)}>课次打卡</Button>}
                >
                  {l.className || `课次#${l.id}`}
                </List.Item>
              ))}
            </List>
          ) : <div style={{ color: '#999' }}>暂无排班</div>}
        </Card>
      </div>
      <BottomTab />
    </div>
  );
}
