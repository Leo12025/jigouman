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
  DatePicker,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../api/crm';
import type { Campaign } from '../api/types';

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

export default function CampaignPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listCampaigns());
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
    if (editing) {
      await updateCampaign(editing.id, payload);
      message.success('已保存');
    } else {
      await createCampaign(payload);
      message.success('创建成功');
    }
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    await deleteCampaign(id);
    message.success('已删除');
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '活动名称', dataIndex: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag>,
    },
    {
      title: '活动周期',
      width: 200,
      render: (_: any, r: Campaign) =>
        r.startTime || r.endTime ? `${r.startTime || '?'} ~ ${r.endTime || '?'}` : '-',
    },
    {
      title: '预算',
      dataIndex: 'budget',
      width: 120,
      render: (v: number) => (v == null ? '-' : v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>),
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, r: Campaign) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该活动？" okText="删除" cancelText="取消" onConfirm={() => remove(r.id)}>
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
          新建活动
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
        title={editing ? '编辑活动' : '新建活动'}
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
            <Select options={CAMPAIGN_TYPES} />
          </Form.Item>
          <Form.Item name="range" label="活动周期">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="budget" label="预算">
            <InputNumber style={{ width: '100%' }} min={0} />
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
