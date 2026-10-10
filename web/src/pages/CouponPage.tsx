import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag, Drawer,
} from 'antd';
import { PlusOutlined, ReloadOutlined, GiftOutlined } from '@ant-design/icons';
import {
  listCouponTemplates, createCouponTemplate, updateCouponTemplate, deleteCouponTemplate,
  grantCoupon, listCoupons,
} from '../api/crm';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DISCOUNT: { label: '折扣', color: 'blue' },
  AMOUNT: { label: '满减', color: 'green' },
  FREE_CLASS: { label: '课时券', color: 'purple' },
};

export default function CouponPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const [grantTpl, setGrantTpl] = useState<any>(null);
  const [grantForm] = Form.useForm();
  const [grants, setGrants] = useState<any[]>([]);
  const [grantOpen, setGrantOpen] = useState(false);

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listCouponTemplates({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(1, size); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ type: 'AMOUNT', value: 0, minSpend: 0, perLimit: 1, validDays: 30, status: 'ACTIVE' }); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) { await updateCouponTemplate(editing.id, v); message.success('已保存'); }
    else { await createCouponTemplate(v); message.success('创建成功'); }
    setOpen(false); load();
  };

  const openGrant = async (tpl: any) => {
    setGrantTpl(tpl);
    grantForm.resetFields();
    grantForm.setFieldsValue({ templateId: tpl.id, count: 1 });
    const list = await listCoupons({ templateId: tpl.id, size: 200 }).catch(() => ({ list: [] }));
    setGrants(list.list); setGrantOpen(true);
  };
  const submitGrant = async () => {
    const v = await grantForm.validateFields();
    await grantCoupon(v);
    message.success('已发放');
    const list = await listCoupons({ templateId: v.templateId, size: 200 });
    setGrants(list.list);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={TYPE_LABELS[v]?.color}>{TYPE_LABELS[v]?.label}</Tag> },
    { title: '面额/折扣', dataIndex: 'value', render: (v: number, r: any) => (r.type === 'DISCOUNT' ? `${v}% off` : `¥${v}`) },
    { title: '门槛', dataIndex: 'minSpend', render: (v: number) => (v ? `满¥${v}` : '无') },
    { title: '限领/总量', render: (_: any, r: any) => `每人${r.perLimit} / ${r.totalQty ?? '不限'}` },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 160, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
          <Button type="link" size="small" icon={<GiftOutlined />} onClick={() => openGrant(r)}>发放</Button>
          <Popconfirm title="确认删除该模板？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteCouponTemplate(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const grantColumns = [
    { title: '券码', dataIndex: 'code' },
    { title: '学员', dataIndex: 'studentId' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'UNUSED' ? 'green' : v === 'USED' ? 'red' : 'default'}>{v}</Tag> },
    { title: '到期', dataIndex: 'expireAt', render: (v: string) => v || '-' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建券模板</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={editing ? '编辑券模板' : '新建券模板'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE_LABELS).map(([v, m]) => ({ value: v, label: m.label }))} />
          </Form.Item>
          <Form.Item name="value" label="面额/折扣值（AMOUNT=元, DISCOUNT=百分比, FREE_CLASS=课时）" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="minSpend" label="使用门槛(元)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="totalQty" label="总发放量(空=不限)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="perLimit" label="每人限领"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="validDays" label="领取后有效天数"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={`发放记录 - ${grantTpl?.name || ''}`} open={grantOpen} onClose={() => setGrantOpen(false)} width={520}>
        <Form form={grantForm} layout="vertical" style={{ marginBottom: 12 }}>
          <Space align="end">
            <Form.Item name="templateId" hidden><InputNumber /></Form.Item>
            <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '必填' }]}><InputNumber min={1} /></Form.Item>
            <Form.Item name="count" label="数量"><InputNumber min={1} max={50} /></Form.Item>
            <Button type="primary" onClick={submitGrant}>发放</Button>
          </Space>
        </Form>
        <Table rowKey="id" size="small" dataSource={grants} columns={grantColumns} />
      </Drawer>
    </div>
  );
}
