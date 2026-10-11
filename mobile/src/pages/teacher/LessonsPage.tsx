import { useState } from 'react';
import { Card, List, Button, Tag, Toast, Dialog, Selector } from 'antd-mobile';
import { listLessons, classGroupStudents, attendLesson } from '../../api/staff';
import { getList } from '../../api/client';
import BottomTab from '../../components/BottomTab';
import { useApi } from '../../hooks/useApi';
import StateView from '../../components/StateView';
import { PullRefresh } from '../../components/PullRefresh';

/** 老师端班级课表 + 点名消课（§11.6） */
export default function LessonsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState<any>(null);
  const { data, loading, error, reload } = useApi(
    () => listLessons({ page: 1, size: 50 }),
  );
  const rows: any[] = data || [];

  const openAttend = async (l: any) => {
    setCurrent(l);
    setStatusMap({});
    if (l.classGroupId) {
      const s = await getList(classGroupStudents(l.classGroupId));
      setStudents(s);
      setStatusMap(Object.fromEntries(s.map((x: any) => [Number(x.id), 'PRESENT'])));
    } else setStudents([]);
  };

  const submitAttend = async () => {
    if (!current) return;
    const ok = await Dialog.confirm({ content: `确认提交点名？出勤/补课将扣 1 课时` });
    if (!ok) return;
    await attendLesson(current.id, students.map((s) => ({ studentId: Number(s.id), status: statusMap[Number(s.id)] || 'PRESENT' })));
    Toast.show({ content: '点名完成' });
    setCurrent(null);
    reload();
  };

  const OPTIONS = [
    { label: '出勤', value: 'PRESENT' },
    { label: '补课', value: 'MAKEUP' },
    { label: '请假', value: 'LEAVE' },
    { label: '缺勤', value: 'ABSENT' },
  ];

  return (
    <PullRefresh onRefresh={async () => reload()}>
      <div className="page">
      <div className="page-title">班级课表</div>
      <div style={{ padding: 12 }}>
        <StateView loading={loading} error={error} onRetry={reload}>
          {rows.length ? rows.map((l) => (
            <Card key={l.id} style={{ marginBottom: 10 }}>
              <List>
                <List.Item extra={l.type === 'MAKEUP' ? <Tag color="warning">补课</Tag> : <Tag color="primary">{l.status}</Tag>}>
                  {l.startTime ? new Date(l.startTime).toLocaleString() : '-'}
                </List.Item>
                <List.Item extra={`班级 ${l.classGroupId ?? '-'}`}>课程 {l.courseId ?? '-'}</List.Item>
              </List>
              <Button size="mini" color="primary" onClick={() => openAttend(l)}>点名消课</Button>
            </Card>
          )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无课次</div></Card>}
        </StateView>

        {current && (
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              点名：{current.startTime ? new Date(current.startTime).toLocaleString() : `课次${current.id}`}
            </div>
            {students.length ? students.map((s) => (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ marginBottom: 4 }}>{s.name}（ID:{s.id}）</div>
                <Selector
                  value={[statusMap[Number(s.id)] || 'PRESENT']}
                  onChange={(v) => setStatusMap({ ...statusMap, [Number(s.id)]: String(v[0]) })}
                  options={OPTIONS}
                />
              </div>
            )) : <div style={{ color: '#999' }}>该班级暂无在读学员</div>}
            <Button block color="primary" onClick={submitAttend} style={{ marginTop: 8 }}>提交点名</Button>
            <Button block fill="none" onClick={() => setCurrent(null)} style={{ marginTop: 8 }}>取消</Button>
          </Card>
        )}
      </div>
      <BottomTab />
      </div>
    </PullRefresh>
  );
}
