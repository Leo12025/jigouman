import { useEffect, useState } from 'react';
import { Card, List, Tag, Selector } from 'antd-mobile';
import { myStudents, myGrowth } from '../../api/parent';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import { PullRefresh } from '../../components/PullRefresh';

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  SCORE: { text: '成绩', color: 'primary' },
  METRIC: { text: '素养', color: 'success' },
  CONTEST: { text: '参赛', color: 'warning' },
  AWARD: { text: '获奖', color: 'danger' },
};

/** 成长档案时间轴（§6.5，家长可查阅） */
export default function GrowthPage() {
  const { data: students, reload: rStudents } = useApi(() => myStudents());
  const studentList: any[] = students || [];
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (!studentId && studentList.length) setStudentId(Number(studentList[0].studentId));
  }, [studentList, studentId]);

  const { data: rows, reload: rGrowth } = useApi(
    () => (studentId ? myGrowth(studentId) : Promise.resolve([])),
    { deps: [studentId] },
  );
  const growth: any[] = rows || [];

  return (
    <PullRefresh
      onRefresh={async () => {
        rStudents();
        rGrowth();
      }}
    >
      <div className="page">
        <div className="page-title">成长档案</div>
        {studentList.length > 1 && (
          <div style={{ padding: 12 }}>
            <Selector
              value={studentId ? [studentId] : []}
              onChange={(v) => v.length && setStudentId(Number(v[0]))}
              options={studentList.map((s) => ({ value: Number(s.studentId), label: s.studentName || `学员${s.studentId}` }))}
            />
          </div>
        )}
        <div style={{ padding: 12 }}>
          {growth.length ? (
            growth.map((r, i) => {
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
            })
          ) : (
            <Card>
              <div style={{ padding: 12, color: '#999' }}>暂无成长记录</div>
            </Card>
          )}
        </div>
        <BottomTab />
      </div>
    </PullRefresh>
  );
}
