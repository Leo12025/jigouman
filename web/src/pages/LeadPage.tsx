import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Drawer,
  Descriptions,
  Tabs,
  DatePicker,
  App,
  Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  listLeads,
  createLead,
  deleteLead,
  assignLead,
  followLead,
  convertLead,
  createTrial,
  listFollows,
  listTrials,
  listChannels,
} from '../api/crm';
import type { Lead, LeadStage, LeadFollow, TrialLesson, Channel } from '../api/types';
import { LEAD_STAGES, LEAD_STAGE_LABEL } from '../api/types';
import { formatDateTime } from '../utils/format';

const STAGE_COLOR: Record<LeadStage, string> = {
  NEW: 'default',
  FOLLOWING: 'blue',
  TRIALED: 'orange',
  SIGNED: 'green',
  INVALID: 'red',
};

const FOLLOW_TYPES = [
  { value: 'CALL', label: '电话' },
  { value: 'WECHAT', label: '微信' },
  { value: 'VISIT', label: '到访' },
  { value: 'OTHER', label: '其他' },
];
const FOLLOW_LABEL: Record<string, string> = Object.fromEntries(
  FOLLOW_TYPES.map((t) => [t.value, t.label]),
);

export default function LeadPage() {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Lead[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ keyword?: string; stage?: LeadStage }>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cur, setCur] = useState<Lead | null>(null);
  const [follows, setFollows] = useState<LeadFollow[]>([]);
  const [trials, setTrials] = useState<TrialLesson[]>([]);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [trialSubmitting, setTrialSubmitting] = useState(false);

  const [leadForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [followForm] = Form.useForm();
  const [trialForm] = Form.useForm();

  const channelName = (id?: number) => channels.find((c) => c.id === id)?.name || '-';

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const params: any = { page: p, size: s };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.stage) params.stage = filters.stage;
      const res = await listLeads(params);
      setRows(res.list);
      setTotal(res.total);
      setPage(p);
      setSize(s);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      setChannels(await listChannels());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load(1, size);
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => load(page, size);

  const openCreate = () => {
    leadForm.resetFields();
    setCreateOpen(true);
  };
  const submitCreate = async () => {
    const v = await leadForm.validateFields();
    setCreateSubmitting(true);
    try {
      await createLead(v);
      message.success('线索已创建');
      setCreateOpen(false);
      reload();
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openAssign = (r: Lead) => {
    setCur(r);
    assignForm.resetFields();
    assignForm.setFieldsValue({ ownerId: r.ownerId });
    setAssignOpen(true);
  };
  const submitAssign = async () => {
    const v = await assignForm.validateFields();
    setAssignSubmitting(true);
    try {
      await assignLead(cur!.id, v.ownerId);
      message.success('已分配');
      setAssignOpen(false);
      reload();
    } finally {
      setAssignSubmitting(false);
    }
  };

  const openFollow = (r: Lead) => {
    setCur(r);
    followForm.resetFields();
    setFollowOpen(true);
  };
  const submitFollow = async () => {
    const v = await followForm.validateFields();
    const payload: any = { ...v };
    if (v.nextFollowAt) payload.nextFollowAt = v.nextFollowAt.toISOString();
    setFollowSubmitting(true);
    try {
      await followLead(cur!.id, payload);
      message.success('跟进已记录');
      setFollowOpen(false);
      reload();
    } finally {
      setFollowSubmitting(false);
    }
  };

  const openTrial = (r: Lead) => {
    setCur(r);
    trialForm.resetFields();
    trialForm.setFieldsValue({ attended: false });
    setTrialOpen(true);
  };
  const submitTrial = async () => {
    const v = await trialForm.validateFields();
    const payload: any = { ...v };
    if (v.trialAt) payload.trialAt = v.trialAt.toISOString();
    setTrialSubmitting(true);
    try {
      await createTrial(cur!.id, payload);
      message.success('试听已记录');
      setTrialOpen(false);
      reload();
    } finally {
      setTrialSubmitting(false);
    }
  };

  const onConvert = (r: Lead) => {
    modal.confirm({
      title: '确认将该线索转化为学员？',
      content: '转化后会自动创建学员档案并绑定联系人。',
      okText: '确认转化',
      cancelText: '取消',
      onOk: async () => {
        const res = await convertLead(r.id, {});
        message.success(res.already ? '该线索已转化' : `转化成功，学员ID=${res.studentId}`);
        reload();
      },
    });
  };

  const openDetail = async (r: Lead) => {
    setCur(r);
    setDetailOpen(true);
    try {
      const [f, t] = await Promise.all([listFollows(r.id), listTrials(r.id)]);
      setFollows(f);
      setTrials(t);
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: number) => {
    await deleteLead(id);
    message.success('已删除');
    reload();
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '渠道', dataIndex: 'channelId', width: 120, render: (v: number) => channelName(v) },
    { title: '意向课程', dataIndex: 'intentionCourse', width: 140, render: (v: string) => v || '-' },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      render: (v: LeadStage) => <Tag color={STAGE_COLOR[v]}>{LEAD_STAGE_LABEL[v]}</Tag>,
    },
    { title: '归属', dataIndex: 'ownerId', width: 80, render: (v: number) => v ?? '-' },
    {
      title: '最近跟进',
      dataIndex: 'lastFollowAt',
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '操作',
      width: 260,
      render: (_: any, r: Lead) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openAssign(r)}>
            分配
          </Button>
          <Button type="link" size="small" onClick={() => openFollow(r)}>
            跟进
          </Button>
          <Button type="link" size="small" onClick={() => openTrial(r)}>
            试听
          </Button>
          <Button type="link" size="small" onClick={() => onConvert(r)}>
            转化
          </Button>
          <Button type="link" size="small" onClick={() => openDetail(r)}>
            详情
          </Button>
          <Popconfirm title="确认删除该线索？" okText="删除" cancelText="取消" onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], [channels]);

  const followColumns = useMemo(() => [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    { title: '方式', dataIndex: 'type', width: 90, render: (v: string) => FOLLOW_LABEL[v] || v },
    { title: '内容', dataIndex: 'content', render: (v: string) => v || '-' },
    {
      title: '下次跟进',
      dataIndex: 'nextFollowAt',
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
  ], []);

  const trialColumns = useMemo(() => [
    {
      title: '试听时间',
      dataIndex: 'trialAt',
      width: 170,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '到课',
      dataIndex: 'attended',
      width: 80,
      render: (v: number) => (v === 1 ? <Tag color="green">已到课</Tag> : <Tag>未到课</Tag>),
    },
    { title: '反馈', dataIndex: 'feedback', render: (v: string) => v || '-' },
  ], []);

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="姓名/手机号"
          allowClear
          style={{ width: 180 }}
          onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value || undefined }))}
          onPressEnter={() => load(1, size)}
        />
        <Select
          placeholder="阶段"
          allowClear
          style={{ width: 140 }}
          options={LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] }))}
          onChange={(v) => setFilters((f) => ({ ...f, stage: v }))}
        />
        <Button type="primary" onClick={() => load(1, size)}>
          查询
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setFilters({}); load(1, size); }}>
          重置
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建线索
        </Button>
        <Button onClick={() => navigate('/funnel')}>转化漏斗</Button>
      </Space>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
        onChange={(p, s) => load(p.current, p.pageSize || size)}
      />

      {/* 新建线索 */}
      <Modal
        title="新建线索"
        open={createOpen}
        confirmLoading={createSubmitting}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={leadForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="channelId" label="来源渠道">
            <Select allowClear options={channels.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              options={[
                { value: 1, label: '男' },
                { value: 2, label: '女' },
              ]}
            />
          </Form.Item>
          <Form.Item name="intentionCourse" label="意向课程">
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配 */}
      <Modal
        title={`分配线索${cur ? ` - ${cur.name}` : ''}`}
        open={assignOpen}
        confirmLoading={assignSubmitting}
        onOk={submitAssign}
        onCancel={() => setAssignOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="ownerId" label="归属顾问ID" rules={[{ required: true, message: '请输入顾问ID' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 跟进 */}
      <Modal
        title={`跟进线索${cur ? ` - ${cur.name}` : ''}`}
        open={followOpen}
        confirmLoading={followSubmitting}
        onOk={submitFollow}
        onCancel={() => setFollowOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={followForm} layout="vertical">
          <Form.Item name="type" label="跟进方式" rules={[{ required: true, message: '请选择方式' }]}>
            <Select options={FOLLOW_TYPES} />
          </Form.Item>
          <Form.Item name="content" label="跟进内容">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="nextFollowAt" label="下次跟进时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 试听 */}
      <Modal
        title={`记录试听${cur ? ` - ${cur.name}` : ''}`}
        open={trialOpen}
        confirmLoading={trialSubmitting}
        onOk={submitTrial}
        onCancel={() => setTrialOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={trialForm} layout="vertical">
          <Form.Item name="trialAt" label="试听时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="attended" label="是否到课" valuePropName="checked">
            <Select
              options={[
                { value: false, label: '未到课' },
                { value: true, label: '已到课' },
              ]}
            />
          </Form.Item>
          <Form.Item name="feedback" label="试听反馈">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 */}
      <Drawer title="线索详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={720}>
        {cur && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名">{cur.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{cur.phone}</Descriptions.Item>
              <Descriptions.Item label="阶段">
                <Tag color={STAGE_COLOR[cur.stage]}>{LEAD_STAGE_LABEL[cur.stage]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="来源渠道">{channelName(cur.channelId)}</Descriptions.Item>
              <Descriptions.Item label="意向课程">{cur.intentionCourse || '-'}</Descriptions.Item>
              <Descriptions.Item label="归属顾问">{cur.ownerId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="转化学员ID">{cur.convertedStudentId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{cur.remark || '-'}</Descriptions.Item>
            </Descriptions>
            <Tabs
              items={[
                {
                  key: 'follow',
                  label: '跟进记录',
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={followColumns}
                      dataSource={follows}
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'trial',
                  label: '试听记录',
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      columns={trialColumns}
                      dataSource={trials}
                      pagination={false}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
