import { useEffect, useState } from 'react';
import { Tree, Button, Space, Modal, Form, Input, Select, Popconfirm, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { orgTree, createOrg, updateOrg, deleteOrg } from '../api/crm';

export default function OrgPage() {
  const { message } = App.useApp();
  const [tree, setTree] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const t = await orgTree().catch(() => []);
    setTree(t);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toAntTree = (nodes: any[]): any[] =>
    nodes.map((n) => ({
      title: `${n.name}（${n.type}）`,
      key: String(n.id),
      children: n.children && n.children.length ? toAntTree(n.children) : undefined,
    }));

  const openCreate = (pid?: number) => { setEditing(null); setParentId(pid); form.resetFields(); form.setFieldsValue({ type: 'BRANCH', status: 'ACTIVE' }); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = { ...v, parentId };
      if (editing) { await updateOrg(editing.id, payload); message.success('已保存'); }
      else { await createOrg(payload); message.success('创建成功'); }
      setOpen(false);
      load();
    } catch {
      // 失败提示由请求层统一处理
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="组织架构">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(undefined)}>新建组织</Button>
      </Space>
      <Tree
        treeData={toAntTree(tree)}
        defaultExpandAll
        titleRender={(n) => (
          <Space>
            <span>{n.title}</span>
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); openCreate(Number(n.key)); }}>加下级</Button>
            <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setEditing({ id: Number(n.key) }); setParentId(undefined); form.setFieldsValue({ name: String(n.title).split('（')[0], type: 'BRANCH', status: 'ACTIVE' }); setOpen(true); }}>编辑</Button>
            <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async (e) => { e?.stopPropagation(); await deleteOrg(Number(n.key)); message.success('已删除'); load(); }}>
              <Button type="link" danger size="small" onClick={(e) => e.stopPropagation()}>删除</Button>
            </Popconfirm>
          </Space>
        )}
      />
      <Modal title={editing ? '编辑组织' : '新建组织'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={[{ value: 'HQ', label: '总部' }, { value: 'BRANCH', label: '分校' }, { value: 'CAMPUS', label: '校区' }]} /></Form.Item>
          <Form.Item name="region" label="区域"><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
