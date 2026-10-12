import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Tag, Modal, Form, Input, InputNumber, Select, Space, App,
  Descriptions, Divider, Statistic, Card, Row, Col, Empty,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  createHomework, listHomeworks, getHomework, reviewHomework, homeworkStats, homeworkUnsubmitted,
} from '../api/crm';
import { formatDateTime } from '../utils/format';

const HW_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PUBLISHED: { label: '已发布', color: 'blue' },
  CLOSED: { label: '已截止', color: 'default' },
};

export default function HomeworkPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [classGroupId, setClassGroupId] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 详情 / 批改 / 统计 / 未提交
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewFor, setReviewFor] = useState<any>(null);
  const [reviewForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);

  const load = async (p = page) => {
    const r = await listHomeworks({ page: p, size: 20, classGroupId });
    setRows(r.list); setTotal(r.total); setPage(p);
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [classGroupId]);

  const submitCreate = async () => {
    const v = await form.validateFields();
    setCreateSubmitting(true);
    try {
      await createHomework({
        classGroupId: v.classGroupId,
        lessonId: v.lessonId,
        courseId: v.courseId,
        title: v.title,
        content: v.content,
        deadline: v.deadline || undefined,
      });
      message.success('作业已布置');
      setOpen(false); load(1);
    } finally { setCreateSubmitting(false); }
  };

  const openDetail = async (id: number) => {
    const d = await getHomework(id);
    setDetail(d); setDetailOpen(true);
  };

  const submitReview = async () => {
    const v = await reviewForm.validateFields();
    setReviewSubmitting(true);
    try {
      await reviewHomework(reviewFor.id, v);
      message.success('批改已提交');
      setReviewFor(null);
      if (detail) {
        const d = await getHomework(detail.id);
        setDetail(d);
      }
      load();
    } finally { setReviewSubmitting(false); }
  };

  const showStats = async (id: number) => {
    const s = await homeworkStats(id);
    setStats(s);
  };
  const showPending = async (id: number) => {
    const p = await homeworkUnsubmitted(id);
    setPending(p); setPendingOpen(true);
  };

  const cols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', width: 180 },
    { title: '班级', dataIndex: 'classGroupId', width: 80 },
    { title: '课次', dataIndex: 'lessonId', width: 80, render: (v: number) => v || '-' },
    { title: '截止', dataIndex: 'deadline', width: 150, render: (v: string) => formatDateTime(v) },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={HW_STATUS[v]?.color}>{HW_STATUS[v]?.label}</Tag> },
    {
      title: '操作', width: 260,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openDetail(r.id)}>详情/批改</Button>
          <Button type="link" size="small" onClick={() => showStats(r.id)}>统计</Button>
          <Button type="link" size="small" onClick={() => showPending(r.id)}>未提交</Button>
        </Space>
      ),
    },
  ], []);

  const submitCols = useMemo(() => [
    { title: '学员', dataIndex: 'studentId', width: 90 },
    { title: '内容', dataIndex: 'content', width: 160, render: (v: string) => v || '-' },
    { title: '提交时间', dataIndex: 'submitAt', width: 140, render: (v: string) => formatDateTime(v) },
    { title: '逾期', dataIndex: 'isLate', width: 70, render: (v: number) => (v ? <Tag color="red">逾期</Tag> : <Tag color="green">按时</Tag>) },
    {
      title: '评分', width: 90,
      render: (_: any, r: any) => (r.review?.score != null ? r.review.score : <Tag>待批改</Tag>),
    },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Button type="link" size="small" onClick={() => { reviewForm.setFieldsValue({ score: r.review?.score, comment: r.review?.comment, isExcellent: r.review?.isExcellent ?? 0 }); setReviewFor(r); }}>
          {r.review ? '修改批改' : '批改'}
        </Button>
      ),
    },
  ], []);

  return (
    <PageContainer title="作业管理">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => load(1)}>刷新</Button>
        <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>布置作业</Button>
        <InputNumber placeholder="班级ID" style={{ width: 120 }} value={classGroupId} onChange={(v) => setClassGroupId(v ?? undefined)} />
      </Space>

      <Table rowKey="id" size="small" dataSource={rows} columns={cols}
        pagination={{ current: page, pageSize: 20, total, onChange: load }} />

      {/* 布置作业 */}
      <Modal title="布置作业" open={open} confirmLoading={createSubmitting} onOk={submitCreate} onCancel={() => setOpen(false)} okText="布置" cancelText="取消" width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
          <Form.Item name="content" label="内容"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="classGroupId" label="班级ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="lessonId" label="课次ID(可选)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="courseId" label="课程ID(可选)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="deadline" label="截止时间(可选)"><Input type="datetime-local" /></Form.Item>
        </Form>
      </Modal>

      {/* 详情 + 提交列表 */}
      <Modal title={detail ? `作业详情：${detail.title}` : '作业详情'} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={860}>
        {detail ? (
          <>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="班级">{detail.classGroupId || '-'}</Descriptions.Item>
              <Descriptions.Item label="课次">{detail.lessonId || '-'}</Descriptions.Item>
              <Descriptions.Item label="截止">{formatDateTime(detail.deadline)}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="内容" span={2}>{detail.content || '-'}</Descriptions.Item>
            </Descriptions>
            <Divider orientation="left">提交记录</Divider>
            {detail.submits?.length ? (
              <Table rowKey="id" size="small" dataSource={detail.submits} columns={submitCols} pagination={false} />
            ) : <Empty description="暂无提交" />}
          </>
        ) : null}
      </Modal>

      {/* 批改 */}
      <Modal title="批改作业" open={!!reviewFor} confirmLoading={reviewSubmitting} onOk={submitReview} onCancel={() => setReviewFor(null)} okText="提交批改" cancelText="取消">
        <Form form={reviewForm} layout="vertical">
          <Form.Item name="score" label="得分"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="comment" label="评语"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="isExcellent" label="是否优秀作业">
            <Select options={[{ value: 0, label: '否' }, { value: 1, label: '是' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 统计 */}
      <Modal title="作业统计" open={!!stats} onCancel={() => setStats(null)} footer={null}>
        {stats && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="应提交" value={stats.expectedCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="已提交" value={stats.submittedCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="已批改" value={stats.reviewedCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="提交率" value={stats.submitRate} suffix="%" /></Card></Col>
            <Col span={8}><Card><Statistic title="按时率" value={stats.onTimeRate} suffix="%" /></Card></Col>
            <Col span={8}><Card><Statistic title="优秀率" value={stats.excellentRate} suffix="%" /></Card></Col>
          </Row>
        )}
      </Modal>

      {/* 未提交名单 */}
      <Modal title="未提交名单" open={pendingOpen} onCancel={() => setPendingOpen(false)} footer={null}>
        {pending.length ? (
          <Table rowKey="id" size="small" pagination={false}
            dataSource={pending} columns={[{ title: '学员', dataIndex: 'name' }, { title: 'ID', dataIndex: 'id' }]} />
        ) : <Empty description="全部已提交" />}
      </Modal>
    </PageContainer>
  );
}
