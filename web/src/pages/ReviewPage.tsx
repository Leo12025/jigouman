import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Form, InputNumber, Input, Select, Tag, App, Drawer, Typography, Alert } from 'antd';
import PageContainer from '../components/PageContainer';
import { RobotOutlined } from '@ant-design/icons';
import { listStudents, listStudentReviews, createCourseReview, draftCourseReview } from '../api/crm';

/**
 * 课后点评（§6.6 / §11.8）：教师按学员撰写点评，支持「AI 生成草稿」——
 * 基于学员近期出勤/作业聚合生成客观描述（可选 LLM 润色），教师需复核后正式提交。
 */
export default function ReviewPage() {
  const { message } = App.useApp();
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<number>();
  const [reviews, setReviews] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftUsed, setDraftUsed] = useState(false);

  useEffect(() => {
    listStudents({ page: 1, size: 200 }).then((r: any) => setStudents(r.list || [])).catch(() => undefined);
  }, []);

  const studentOpts = students.map((s) => ({ value: s.id, label: `${s.name} (#${s.id})` }));

  const viewReviews = async (id: number) => {
    setStudentId(id);
    try {
      const r = await listStudentReviews(id, { page: 1, size: 50 });
      setReviews(r.list || []);
    } catch { /* ignore */ }
  };

  const openWrite = (id: number) => {
    setStudentId(id);
    setDraftUsed(false);
    form.resetFields();
    form.setFieldsValue({ studentId: id });
    setOpen(true);
  };

  const genDraft = async () => {
    const v = await form.validateFields(['studentId']);
    setDrafting(true);
    try {
      const r = await draftCourseReview({ studentId: v.studentId, lessonId: form.getFieldValue('lessonId') });
      form.setFieldsValue({ content: r.draft });
      setDraftUsed(true);
      message.success(r.aiPowered ? '已生成 AI 草稿（请复核后提交）' : '已生成启发式草稿（请复核后提交）');
    } finally {
      setDrafting(false);
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await createCourseReview({ ...v, aiGenerated: draftUsed ? 1 : 0 });
      message.success('点评已提交');
      setOpen(false);
      if (studentId) viewReviews(studentId);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '课次', dataIndex: 'lessonId', width: 90, render: (v: number) => v ?? '-' },
    {
      title: '评分', dataIndex: 'rating', width: 80,
      render: (v: number) => (v ? <Tag color="gold">{v} 星</Tag> : '-'),
    },
    {
      title: 'AI', dataIndex: 'aiGenerated', width: 70,
      render: (v: number) => (v === 1 ? <Tag color="purple">AI</Tag> : '-'),
    },
    { title: '内容', dataIndex: 'content', render: (v: string) => v || '-' },
    { title: '时间', dataIndex: 'createdAt', width: 170 },
  ];

  return (
    <PageContainer title="课后点评">
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            showSearch
            placeholder="选择学员"
            optionFilterProp="label"
            style={{ width: 240 }}
            options={studentOpts}
            onChange={(v) => { setStudentId(v); viewReviews(v); }}
          />
          <Button type="primary" disabled={!studentId} onClick={() => openWrite(studentId!)}>写点评</Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        size="small"
        dataSource={reviews}
        columns={columns}
        pagination={false}
        locale={{ emptyText: studentId ? '该学员暂无点评' : '请先选择学员' }}
        scroll={{ x: 'max-content' }}
      />

      <Drawer
        title="撰写课后点评"
        open={open}
        width={560}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button icon={<RobotOutlined />} loading={drafting} onClick={genDraft}>AI 生成草稿</Button>
            <Button type="primary" loading={submitting} onClick={submit}>提交</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
            <Select showSearch optionFilterProp="label" options={studentOpts} disabled={!!studentId} />
          </Form.Item>
          <Form.Item name="lessonId" label="课次ID(可选)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rating" label="评分(1-5，可选)">
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="content" label="点评内容" rules={[{ required: true, message: '请输入点评内容' }]}>
            <Input.TextArea rows={6} placeholder="点击「AI 生成草稿」自动填充，或手工输入" />
          </Form.Item>
          {draftUsed && <Alert type="warning" showIcon message="AI 草稿仅供参考，请教师复核事实后提交。" />}
        </Form>
      </Drawer>
    </PageContainer>
  );
}
