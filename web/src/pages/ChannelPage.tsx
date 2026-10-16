import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Switch, Tag, Popconfirm, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { listChannels, createChannel, updateChannel, deleteChannel, ingestChannelLeads } from '../api/crm';
import type { Channel } from '../api/types';
import { useCrud } from '../hooks/useCrud';

const CHANNEL_TYPES = [
  { value: 'GROUND_PUSH', label: '地推' },
  { value: 'WECHAT', label: '朋友圈' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'REFERRED', label: '转介绍' },
  { value: 'OTHER', label: '其他' },
];
const EXTERNAL_TYPES = [
  { value: 'NONE', label: '非直连(手工录入)' },
  { value: 'DOUYIN', label: '抖音广告' },
  { value: 'MEITUAN', label: '美团/大众点评' },
  { value: 'WECHAT_ADS', label: '微信广告' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CHANNEL_TYPES.map((t) => [t.value, t.label]),
);

export default function ChannelPage() {
  const fetchList = useCallback(async () => {
    const list = await listChannels();
    return { list, total: list.length };
  }, []);
  const { rows, loading, submitting, load, save, del } = useCrud<Channel>({
    list: fetchList,
    create: createChannel,
    update: updateChannel,
    remove: deleteChannel,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [form] = Form.useForm();

  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestCh, setIngestCh] = useState<Channel | null>(null);
  const [ingestForm] = Form.useForm();
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any>(null);
  const { message } = App.useApp();

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'OTHER', status: 1, ingestEnabled: 0, externalType: 'NONE' });
    setOpen(true);
  };
  const openEdit = (r: Channel) => {
    setEditing(r);
    form.setFieldsValue(r);
    setOpen(true);
  };

  const openIngest = (r: Channel) => {
    setIngestCh(r);
    setIngestResult(null);
    ingestForm.resetFields();
    ingestForm.setFieldsValue({ simulated: true, simulateCount: 5 });
    setIngestOpen(true);
  };
  const submitIngest = async () => {
    const v: any = await ingestForm.validateFields();
    const payload: any = { channelId: ingestCh!.id, simulated: !!v.simulated, simulateCount: v.simulateCount };
    if (!v.simulated && v.items) {
      try {
        payload.item = JSON.parse(v.items);
      } catch {
        message.error('线索 JSON 格式不正确');
        return;
      }
    }
    if (v.campaignId) payload.campaignIdNum = v.campaignId;
    setIngestSubmitting(true);
    try {
      const res = await ingestChannelLeads(ingestCh!.id, payload);
      setIngestResult(res);
      message.success(`入库 ${res.ingested} 条，跳过重复 ${res.skipped} 条`);
    } finally {
      setIngestSubmitting(false);
    }
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...v, status: v.status ? 1 : 0 };
    const ok = await save(editing, payload);
    if (ok) setOpen(false);
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '渠道名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag> },
    { title: '成本', dataIndex: 'cost', width: 120, render: (v: number) => (v == null ? '-' : v) },
    { title: '来源', dataIndex: 'source', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    {
      title: '外部直连', dataIndex: 'ingestEnabled', width: 110,
      render: (v: number, r: Channel) =>
        v === 1 ? <Tag color="blue">{EXTERNAL_TYPES.find((e) => e.value === r.externalType)?.label || '已开启'}</Tag> : <Tag>未开启</Tag>,
    },
    {
      title: '操作', width: 200, render: (_: any, r: Channel) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<CloudUploadOutlined />} onClick={() => openIngest(r)}>直连入库</Button>
          <Popconfirm title="确认删除该渠道？" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <PageContainer title="渠道管理">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建渠道</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows} pagination={false}  scroll={{ x: 'max-content' }} />
      <Modal title={editing ? '编辑渠道' : '新建渠道'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={CHANNEL_TYPES} /></Form.Item>
          <Form.Item name="cost" label="成本"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="source" label="来源"><Input /></Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
          <Form.Item name="ingestEnabled" label="外部线索直连" valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })} tooltip="开启后可由抖音/美团/微信广告自动入库">
            <Switch />
          </Form.Item>
          <Form.Item name="externalType" label="外部直连来源">
            <Select options={EXTERNAL_TYPES} />
          </Form.Item>
          <Form.Item name="configJson" label="直连配置(JSON)" tooltip="凭证/参数，生产应加密存储">
            <Input.TextArea rows={2} placeholder='{"accessToken":""}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`渠道直连入库 - ${ingestCh?.name || ''}`}
        open={ingestOpen}
        confirmLoading={ingestSubmitting}
        onOk={submitIngest}
        onCancel={() => setIngestOpen(false)}
        okText="拉取入库"
        cancelText="取消"
      >
        <Form form={ingestForm} layout="vertical">
          <Form.Item name="simulated" label="模拟拉取(无真实网关时联调用)" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="simulateCount" label="模拟线索数量">
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="items" label="真实线索(JSON 数组，关闭模拟时使用)" tooltip='[{"name":"张三","phone":"139...","intentionCourse":"少儿编程","externalId":"EXT1"}]'>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="campaignId" label="关联活动ID(可选)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        {ingestResult && (
          <div style={{ marginTop: 8 }}>
            入库 <b>{ingestResult.ingested}</b> 条，跳过重复 <b>{ingestResult.skipped}</b> 条，共传入 {ingestResult.total} 条。入库线索阶段=NEW，可在「线索 CRM」查看。
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
