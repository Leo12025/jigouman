import { useEffect, useState } from 'react';
import { Card, Button, Input, Toast, Selector, Form } from 'antd-mobile';
import { listExams, createScore } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

const TYPES = [
  { label: '测评', value: 'EXAM' },
  { label: '日常', value: 'DAILY' },
  { label: '赛事', value: 'CONTEST' },
];

/** 老师端成绩录入（§6.5 / §11.6） */
export default function ScoresPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState<number | undefined>();
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('EXAM');
  const [score, setScore] = useState('');
  const [level, setLevel] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    listExams().then(setExams).catch(() => setExams([]));
  }, []);

  const submit = async () => {
    if (!studentId || !score) { Toast.show({ content: '请填写学员ID与得分' }); return; }
    await createScore({
      studentId: Number(studentId),
      examId,
      type,
      score: Number(score),
      level: level || undefined,
      comment: comment || undefined,
    });
    Toast.show({ content: '成绩已录入' });
    setStudentId(''); setScore(''); setLevel(''); setComment('');
  };

  return (
    <div className="page">
      <div className="page-title">成绩录入</div>
      <div style={{ padding: 12 }}>
        <Card>
          <Form layout="vertical">
            <Form.Item label="学员ID">
              <Input placeholder="学员ID" value={studentId} onChange={setStudentId} />
            </Form.Item>
            <Form.Item label="测评(可选)">
              <Selector
                value={examId ? [examId] : []}
                onChange={(v) => setExamId(v.length ? Number(v[0]) : undefined)}
                options={exams.map((e) => ({ value: Number(e.id), label: e.name }))}
              />
            </Form.Item>
            <Form.Item label="类型">
              <Selector value={[type]} onChange={(v) => setType(String(v[0]))} options={TYPES} />
            </Form.Item>
            <Form.Item label="得分">
              <Input placeholder="得分" value={score} onChange={setScore} />
            </Form.Item>
            <Form.Item label="等级(可选)">
              <Input placeholder="如 优秀" value={level} onChange={setLevel} />
            </Form.Item>
            <Form.Item label="评语(可选)">
              <Input placeholder="评语" value={comment} onChange={setComment} />
            </Form.Item>
          </Form>
          <Button block color="primary" onClick={submit}>提交成绩</Button>
        </Card>
      </div>
      <BottomTab />
    </div>
  );
}
