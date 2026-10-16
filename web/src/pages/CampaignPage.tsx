import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Switch, Tag, DatePicker, Popconfirm, Tabs } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  listCampaigns, createCampaign, updateCampaign, deleteCampaign,
  listCampaignTemplates, createCampaignTemplate, updateCampaignTemplate, deleteCampaignTemplate, launchFromTemplate,
} from '../api/crm';
import type { Campaign } from '../api/types';
import { useCrud } from '../hooks/useCrud';

const { RangePicker } = DatePicker;

const CAMPAIGN_TYPES = [
  { value: 'EXPERIENCE', label: '体验课' },
  { value: 'OPEN_CLASS', label: '公开课' },
  { value: 'GROUP_BUY', label: '拼团' },
  { value: 'PROMO', label: '限时优惠' },
  { value: 'OTHER', label: '其他' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CAMPAIGN_TYPES.map((t) => [t.value, t.label]),
);

/** 活动模板库（§4.2 营销增强）：沉淀可复用活动配置，一键发起为正式活动 */
function TemplateTab() {
  const fetchList = useCallback(async () => {
    const list = await listCampaignTemplates();
    return { list, total: list.length };
  }, []);
  const { rows, loading, submitting, load, save, del } = useCrud<any>({
    list: fetchList,
    create: createCampaignTemplate,
    update: updateCampaignTemplate,
    remove: deleteCampaignTemplate,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [launching, setLaunching] = useState<any>(null);
  const [launchForm] = Form.useForm();
  const [form] = Form.useForm();

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setLaunching(null);
    form.resetFields();
    form.setFieldsValue({ type: 'GROUP_BUY', status: 1 });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setLaunching(null);
    form.resetFields();
    form.setFieldsValue(r);
    setOpen(true);
  };
  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v, status: v.status ? 1 : 0 };
    const ok = await save(editing, payload);
    if (ok) setOpen(false);
  };
  const openLaunch = (r: any) => {
    setLaunching(r);
    launchForm.resetFields();
    setOpen(true);
  };
  const submitLaunch = async () => {
    const v = await launchForm.validateFields();
    try {
      await launchFromTemplate(launching.id, v);
      window.alert('已从模板发起正式活动');
      setOpen(false);
    } catch { /* 请求层统一提示 */ }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '模板名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag> },
    { title: '说明', dataIndex: 'description', render: (v: string) => v || '-' },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>),
    },
    {
      title: '操作', width: 180, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<ThunderboltOutlined />} onClick={() => openLaunch(r)}>一键发起</Button>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建模板</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }} />

      <Modal title={editing ? '编辑模板' : '新建模板'} open={open && !launching} confirmLoading={submitting} onOk={submit} onCancel={() => { setOpen(false); setLaunching(null); }} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={CAMPAIGN_TYPES} /></Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="configJson" label="默认配置(JSON)" tooltip="发起时复制到正式活动，如预算/玩法参数">
            <Input.TextArea rows={3} placeholder='{"budget":0}' />
          </Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`一键发起：${launching?.name}`} open={open && !!launching} confirmLoading={submitting} onOk={submitLaunch} onCancel={() => { setOpen(false); setLaunching(null); }} okText="发起" cancelText="取消">
        <Form form={launchForm} layout="vertical">
          <Form.Item name="startTime" label="开始日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="endTime" label="结束日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="budget" label="预算"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function CampaignPage() {
  const fetchList = useCallback(async () => {
    const list = await listCampaigns();
    return { list, total: list.length };
  }, []);
  const { rows, loading, submitting, load, save, del } = useCrud<Campaign>({
    list: fetchList,
    create: createCampaign,
    update: updateCampaign,
    remove: deleteCampaign,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'OTHER', status: 1, range: null });
    setOpen(true);
  };
  const openEdit = (r: Campaign) => {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      range: r.startTime || r.endTime ? [dayjs(r.startTime), dayjs(r.endTime)] : null,
    });
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v, status: v.status ? 1 : 0 };
    delete payload.range;
    if (v.range) {
      payload.startTime = v.range[0].format('YYYY-MM-DD');
      payload.endTime = v.range[1].format('YYYY-MM-DD');
    }
    const ok = await save(editing, payload);
    if (ok) setOpen(false);
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '活动名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag> },
    {
      title: '活动周期', width: 200,
      render: (_: any, r: Campaign) =>
        r.startTime || r.endTime ? `${r.startTime || '?'} ~ ${r.endTime || '?'}` : '-',
    },
    { title: '预算', dataIndex: 'budget', width: 120, render: (v: number) => (v == null ? '-' : v) },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    {
      title: '操作', width: 140, render: (_: any, r: Campaign) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该活动？" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <PageContainer title="市场活动">
      <Tabs
        defaultActiveKey="campaigns"
        items={[
          {
            key: 'campaigns',
            label: '市场活动',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建活动</Button>
                </Space>
                <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }} />
              </div>
            ),
          },
          {
            key: 'templates',
            label: '活动模板库',
            children: <TemplateTab />,
          },
        ]}
      />
      <Modal title={editing ? '编辑活动' : '新建活动'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={CAMPAIGN_TYPES} /></Form.Item>
          <Form.Item name="range" label="活动周期"><RangePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="budget" label="预算"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
