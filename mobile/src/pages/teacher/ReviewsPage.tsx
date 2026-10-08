import { useState } from 'react';
import { Card, Button, Input, TextArea, Toast, Form, Selector } from 'antd-mobile';
import { createCourseReview } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

const RATINGS = [1, 2, 3, 4, 5].map((n) => ({ label: `${n}星`, value: n }));

/** 老师端课后点评（§6.6，写完自动完成点评待办） */
export default function ReviewsPage() {
  const [studentId, setStudentId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [content, setContent] = useState('');

  const submit = async () => {
    if (!studentId) { Toast.show({ content: '请填写学员ID' }); return; }
    await createCourseReview({
      studentId: Number(studentId),
      lessonId: lessonId ? Number(lessonId) : undefined,
      rating,
      content: content || undefined,
    });
    Toast.show({ content: '点评已提交' });
    setStudentId(''); setLessonId(''); setContent('');
  };

  return (
    <div className="page">
      <div className="page-title">课后点评</div>
      <div style={{ padding: 12 }}>
        <Card>
          <Form layout="vertical">
            <Form.Item label="学员ID">
              <Input placeholder="学员ID" value={studentId} onChange={setStudentId} />
            </Form.Item>
            <Form.Item label="课次ID(可选，用于自动完成点评待办)">
              <Input placeholder="课次ID" value={lessonId} onChange={setLessonId} />
            </Form.Item>
            <Form.Item label="课堂表现">
              <Selector value={[rating]} onChange={(v) => setRating(Number(v[0]))} options={RATINGS} />
            </Form.Item>
            <Form.Item label="点评内容">
              <TextArea placeholder="点评内容" rows={4} value={content} onChange={setContent} />
            </Form.Item>
          </Form>
          <Button block color="primary" onClick={submit}>提交点评</Button>
        </Card>
      </div>
      <BottomTab />
    </div>
  );
}
