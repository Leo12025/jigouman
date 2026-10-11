import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listTenants, createTenant, updateTenant, deleteTenant } from '../api/crm';

/** 平台级租户中心（§2.2 多租户）：仅平台管理员可见，管理租户与域名映射 */
export default function TenantPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await listTenants({});
      setRows(r || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE' });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({ slug: r.slug, domain: r.domain || '', name: r.name, status: r.status, maxCampuses: r.maxCampuses ?? '', expiresAt: r.expiresAt || '', config: r.config || '' });
    setOpen(true);
  };
  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v };
    if (payload.maxCampuses === '' || payload.maxCampuses == null) delete payload.maxCampuses;
    if (payload.expiresAt === '') delete payload.expiresAt;
    if (editing) {
      await updateTenant(editing.id, payload);
      message.success('已保存');
    } else {
      await createTenant(payload);
      message.success('创建成功');
    }
    setOpen(false);
    load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建租户</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 90 },
          { title: '名称', dataIndex: 'name' },
          { title: '短码(slug)', dataIndex: 'slug' },
          { title: '域名', dataIndex: 'domain', render: (d: string) => d || <Tag>未绑定</Tag> },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag>,
          },
          { title: '校区额度', dataIndex: 'maxCampuses', render: (v: number) => (v == null ? '不限' : v) },
          { title: '有效期至', dataIndex: 'expiresAt', render: (v: string) => (v ? v : '永久') },
          {
            title: '操作',
            render: (_: any, r: any) => (
              <Space>
                <Button type="link" onClick={() => openEdit(r)}>编辑</Button>
                <Popconfirm title="删除租户?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteTenant(r.id); message.success('已删除'); load(); }}>
                  <Button type="link" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal title={editing ? '编辑租户' : '新建租户'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="机构名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="slug" label="短码(slug，子域名用)" rules={[{ required: true, message: '请输入短码' }]}><Input placeholder="如 acme" /></Form.Item>
          <Form.Item name="domain" label="访问域名" rules={[{ required: true, message: '请输入域名' }]}>
            <Input placeholder="如 acme.example.com 或 acme.localhost" />
          </Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
          <Form.Item name="maxCampuses" label="校区额度(最大校区数，留空=不限)"><Input type="number" placeholder="如 20" /></Form.Item>
          <Form.Item name="expiresAt" label="有效期至(留空=永久，ISO格式)"><Input placeholder="2027-12-31T23:59:59" /></Form.Item>
          <Form.Item name="config" label="配置(JSON，可选)"><Input.TextArea rows={3} placeholder='{"theme":"blue"}' /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
