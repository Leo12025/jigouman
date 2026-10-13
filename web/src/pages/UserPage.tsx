import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined, KeyOutlined } from '@ant-design/icons';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword, listRoles, getTenantMe, listOrgs } from '../api/crm';
import { useCrud } from '../hooks/useCrud';

export default function UserPage() {
  const { message } = App.useApp();
  const { rows, total, page, size, loading, submitting, load, save, del } = useCrud({
    list: listUsers,
    create: createUser,
    update: updateUser,
    remove: deleteUser,
  });
  const [roles, setRoles] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pwdTarget, setPwdTarget] = useState<any>(null);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    load(1, size);
    listRoles().then(setRoles).catch(() => undefined);
    listOrgs({}).then(setOrgs).catch(() => undefined);
    // 当前租户短码，用于展示「用户名@域（租户）名」登录身份
    getTenantMe().then((t) => setTenantSlug(t?.slug || '')).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ status: 1 }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    form.setFieldsValue({ ...r, roleIds: (r.roles || []).map((x: any) => x.id) });
    setOpen(true);
  };
  const submit = async () => {
    const v = await form.validateFields();
    const ok = await save(editing, v);
    if (ok) setOpen(false);
  };

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);
  const orgOptions = useMemo(() => orgs.map((o) => ({ value: o.id, label: o.name })), [orgs]);

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '账号', dataIndex: 'username', width: 120 },
    {
      title: '登录账号(全)',
      width: 200,
      render: (_: any, r: any) =>
        tenantSlug ? `${r.username}@${tenantSlug}` : r.username,
    },
    { title: '姓名', dataIndex: 'name', width: 120, render: (v: string) => v || '-' },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v: string) => v || '-' },
    { title: '角色', dataIndex: 'roles', render: (v: any[]) => (v || []).map((r) => <Tag key={r.id}>{r.name}</Tag>) },
    {
      title: '归属校区', dataIndex: 'orgIds', width: 200,
      render: (v: number[]) => {
        if (!v || v.length === 0) return <Tag color="blue">全部校区</Tag>;
        return v.map((id) => <Tag key={id}>{orgs.find((o) => o.id === id)?.name || id}</Tag>);
      },
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>) },
    {
      title: '操作', width: 220, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => { setPwdTarget(r); pwdForm.resetFields(); setPwdOpen(true); }}>重置密码</Button>
          <Popconfirm title="确认删除该用户？" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [tenantSlug, orgs]);

  const submitPwd = async () => {
    const v = await pwdForm.validateFields();
    setPwdSubmitting(true);
    try {
      await resetUserPassword(pwdTarget.id, v.password);
      message.success('已重置');
      setPwdOpen(false);
    } catch {
      // 失败提示由请求层统一处理
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <PageContainer title="用户管理">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建用户</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)}  scroll={{ x: 'max-content' }} />

      <Modal title={editing ? '编辑用户' : '新建用户'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="至少 6 位" />
            </Form.Item>
          )}
          <Form.Item name="name" label="姓名"><Input /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input /></Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" allowClear options={roleOptions} />
          </Form.Item>
          <Form.Item name="orgIds" label="归属校区" tooltip="不选=该租户全部校区可见；选择后仅可在所选校区范围内操作数据">
            <Select mode="multiple" allowClear placeholder="全部校区可见" options={orgOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`重置密码 - ${pwdTarget?.username || ''}`} open={pwdOpen} confirmLoading={pwdSubmitting} onOk={submitPwd} onCancel={() => setPwdOpen(false)} okText="确定" cancelText="取消">
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
