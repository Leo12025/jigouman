import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message, Alert,
} from 'antd';
import { listExams, createExam, createScore } from '../api/crm';

const EXAM_TYPE_LABEL: Record<string, string> = {
  REGULAR: '常规', MIDTERM: '期中', FINAL: '期末',
};

export default function ScorePage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [cur, setCur] = useState<any>(null);
  const [examForm] = Form.useForm();
  const [scoreForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listExams();
      setExams(r || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onCreateExam = async () => {
    const v = await examForm.validateFields();
    await createExam(v);
    message.success('已创建测评（自动生成"成绩录入"待办）');
    setExamOpen(false); examForm.resetFields(); load();
  };
  const onScore = async () => {
    const v = await scoreForm.validateFields();
    await createScore({ ...v, examId: cur.id });
    message.success('已录入成绩（关闭"成绩录入"待办）');
    setScoreOpen(false); scoreForm.resetFields();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '测评名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{EXAM_TYPE_LABEL[t] || t}</Tag> },
    { title: '满分', dataIndex: 'fullScore', width: 90 },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Button size="small" type="primary" onClick={() => { setCur(r); setScoreOpen(true); }}>录入成绩</Button>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type="info" showIcon style={{ marginBottom: 12 }}
        message="成绩录入事件化（§4.26）"
        description="创建测评即自动生成「成绩录入」待办并提醒负责人；录入成绩后该待办自动关闭。可在「待办中心」查看与处理。"
      />
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <span />
        <Button type="primary" onClick={() => setExamOpen(true)}>创建测评</Button>
      </Space>

      <Table rowKey="id" loading={loading} dataSource={exams} columns={columns as any} pagination={false} size="small" />

      <Modal title="创建测评" open={examOpen} onOk={onCreateExam} onCancel={() => setExamOpen(false)} okText="创建">
        <Form form={examForm} layout="vertical">
          <Form.Item name="name" label="测评名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：期中测验" />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue="REGULAR">
            <Select options={Object.entries(EXAM_TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="fullScore" label="满分" initialValue={100}>
            <InputNumber min={1} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="courseId" label="关联课程ID(可选)">
            <InputNumber style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`录入成绩 · ${cur?.name ?? ''}`}
        open={scoreOpen}
        onOk={onScore}
        onCancel={() => setScoreOpen(false)}
        okText="提交"
      >
        <Form form={scoreForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '请输入学员ID' }]}>
            <InputNumber style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="score" label="得分" rules={[{ required: true, message: '请输入得分' }]}>
            <InputNumber style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="level" label="等级">
            <Select
              allowClear placeholder="可选"
              options={['A', 'B', 'C', '优秀', '良好', '及格'].map((v) => ({ value: v, label: v }))}
            />
          </Form.Item>
          <Form.Item name="comment" label="评语">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
