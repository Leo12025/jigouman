import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { listChannels, createChannel, updateChannel, deleteChannel } from '../api/crm';
import type { Channel } from '../api/types';

const CHANNEL_TYPES = [
  { value: 'GROUND_PUSH', label: '地推' },
  { value: 'WECHAT', label: '朋友圈' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'REFERRED', label: '转介绍' },
  { value: 'OTHER', label: '其他' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CHANNEL_TYPES.map((t) => [t.value, t.label]),
);

export default function ChannelPage() {
  const [rows, setRows] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listChannels());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'OTHER', status: 1 });
    setOpen(true);
  };
  const openEdit = (r: Channel) => {
    setEditing(r);
    form.setFieldsValue(r);
    setOpen(true);
  };

  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...v, status: v.status ? 1 : 0 };
    if (editing) {
      await updateChannel(editing.id, payload);
      message.success('已保存');
    } else {
      await createChannel(payload);
      message.success('创建成功');
    }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    await deleteChannel(id);
    message.success('已删除');
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '渠道名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag>,
    },
    {
      title: '成本',
      dataIndex: 'cost',
      width: 120,
      render: (v: number) => (v == null ? '-' : v),
    },
    { title: '来源', dataIndex: 'source', render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>),
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, r: Channel) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该渠道？" okText="删除" cancelText="取消" onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建渠道
        </Button>
      </Space>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
      <Modal
        title={editing ? '编辑渠道' : '新建渠道'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={CHANNEL_TYPES} />
          </Form.Item>
          <Form.Item name="cost" label="成本">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="source" label="来源">
            <Input />
          </Form.Item>
          <Form.Item
            name="status"
            label="启用"
            valuePropName="checked"
            getValueProps={(v) => ({ checked: v === 1 })}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
