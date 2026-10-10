import { useEffect, useState } from 'react';
import { Card, List, Tag, Selector } from 'antd-mobile';
import { myStudents, myGrowth } from '../../api/parent';
import { getList } from '../../api/client';
import BottomTab from '../../components/BottomTab';

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  SCORE: { text: '成绩', color: 'primary' },
  METRIC: { text: '素养', color: 'success' },
  CONTEST: { text: '参赛', color: 'warning' },
  AWARD: { text: '获奖', color: 'danger' },
};

/** 成长档案时间轴（§6.5，家长可查阅） */
export default function GrowthPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    getList(myStudents()).then((s) => {
      setStudents(s);
      if (s.length) setStudentId(Number(s[0].studentId));
    });
  }, []);

  useEffect(() => {
    if (!studentId) return;
    getList(myGrowth(studentId)).then(setRows);
  }, [studentId]);

  return (
    <div className="page">
      <div className="page-title">成长档案</div>
      {students.length > 1 && (
        <div style={{ padding: 12 }}>
          <Selector
            value={studentId ? [studentId] : []}
            onChange={(v) => v.length && setStudentId(Number(v[0]))}
            options={students.map((s) => ({ value: Number(s.studentId), label: s.studentName || `学员${s.studentId}` }))}
          />
        </div>
      )}
      <div style={{ padding: 12 }}>
        {rows.length ? rows.map((r, i) => {
          const t = TYPE_LABEL[r.type] || { text: r.type, color: 'default' };
          return (
            <Card key={`${r.type}_${r.refId}_${i}`} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={<Tag color={t.color}>{t.text}</Tag>}>
                  {r.at ? new Date(r.at).toLocaleDateString() : '-'}
                </List.Item>
              </List>
              <div style={{ padding: 12 }}>{r.title}</div>
            </Card>
          );
        }) : <Card><div style={{ padding: 12, color: '#999' }}>暂无成长记录</div></Card>}
      </div>
      <BottomTab />
    </div>
  );
}
