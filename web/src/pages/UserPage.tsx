import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, KeyOutlined } from '@ant-design/icons';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword, listRoles } from '../api/crm';

export default function UserPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pwdTarget, setPwdTarget] = useState<any>(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listUsers({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listRoles().then(setRoles).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    if (editing) { await updateUser(editing.id, v); message.success('已保存'); }
    else { await createUser(v); message.success('创建成功'); }
    setOpen(false); load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '账号', dataIndex: 'username', width: 140 },
    { title: '姓名', dataIndex: 'name', width: 120, render: (v: string) => v || '-' },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v: string) => v || '-' },
    { title: '角色', dataIndex: 'roles', render: (v: any[]) => (v || []).map((r) => <Tag key={r.id}>{r.name}</Tag>) },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>) },
    {
      title: '操作', width: 220, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue({ ...r, roleIds: (r.roles || []).map((x: any) => x.id) }); setOpen(true); }}>编辑</Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => { setPwdTarget(r); pwdForm.resetFields(); setPwdOpen(true); }}>重置密码</Button>
          <Popconfirm title="确认删除该用户？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteUser(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ status: 1 }); setOpen(true); }}>新建用户</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={editing ? '编辑用户' : '新建用户'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
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
            <Select mode="multiple" allowClear options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`重置密码 - ${pwdTarget?.username || ''}`} open={pwdOpen} onOk={async () => {
        const v = await pwdForm.validateFields();
        await resetUserPassword(pwdTarget.id, v.password);
        message.success('已重置');
        setPwdOpen(false);
      }} onCancel={() => setPwdOpen(false)} okText="确定" cancelText="取消">
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
