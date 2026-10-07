import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tree, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listRoles, createRole, updateRole, deleteRole, listPermissions } from '../api/crm';

export default function RolePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [treeForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setRows(await listRoles()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    listPermissions().then(setPerms).catch(() => undefined);
  }, []);

  // 权限点按分组聚合成树
  const treeData = Object.entries(
    perms.reduce((acc: any, p) => {
      const g = p.group || 'other';
      (acc[g] = acc[g] || []).push({ title: `${p.name} (${p.code})`, value: p.id, key: p.id });
      return acc;
    }, {}),
  ).map(([group, children]) => ({ title: group, value: `g-${group}`, key: `g-${group}`, children }));

  const checkedKeys = (form.getFieldValue('permissionIds') || []) as number[];

  const submit = async () => {
    const v = await form.validateFields();
    if (editing) { await updateRole(editing.id, v); message.success('已保存'); }
    else { await createRole(v); message.success('创建成功'); }
    setOpen(false); load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '角色编码', dataIndex: 'code', width: 150 },
    { title: '角色名称', dataIndex: 'name', width: 150 },
    { title: '数据范围', dataIndex: 'dataScope', width: 110, render: (v: string) => ({ all: '全部', org: '本校区', self: '本人' }[v || 'org']) },
    { title: '权限数', dataIndex: 'permissions', width: 90, render: (v: any[]) => (v || []).length },
    {
      title: '操作', width: 200, render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => {
            setEditing(r);
            form.setFieldsValue({ code: r.code, name: r.name, dataScope: r.dataScope || 'org' });
            treeForm.setFieldsValue({ permissionIds: (r.permissions || []).map((p: any) => p.id) });
            setOpen(true);
          }}>编辑/分配权限</Button>
          <Popconfirm title="确认删除该角色？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteRole(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null); form.resetFields(); treeForm.resetFields();
          form.setFieldsValue({ dataScope: 'org' }); setOpen(true);
        }}>新建角色</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows} pagination={false} />

      <Modal title={editing ? `编辑角色 - ${editing.name}` : '新建角色'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消" width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="角色编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input disabled={!!editing} placeholder="如 consultant" />
          </Form.Item>
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="dataScope" label="数据范围">
            <Select options={[{ value: 'all', label: '全部数据' }, { value: 'org', label: '本校区' }, { value: 'self', label: '仅本人' }]} />
          </Form.Item>
        </Form>
        <Form form={treeForm} layout="vertical">
          <Form.Item name="permissionIds" label="权限点">
            <Tree
              checkable
              selectable={false}
              treeData={treeData as any}
              defaultCheckedKeys={checkedKeys}
              onCheck={(keys) => {
                const arr = (Array.isArray(keys) ? keys : keys.checked) as any[];
                treeForm.setFieldsValue({ permissionIds: arr.filter((k) => typeof k === 'number') });
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
