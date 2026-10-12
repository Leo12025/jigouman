import { useEffect, useState } from 'react';
import { Tree, Button, Space, Modal, Form, Input, Select, Popconfirm, App, Alert } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  orgTree,
  createOrg,
  updateOrg,
  deleteOrg,
  getTenantMe,
  platformOrgTree,
  platformCreateOrg,
  platformUpdateOrg,
  platformDeleteOrg,
} from '../api/crm';

interface OrgPageProps {
  /** 平台钻取模式：传入目标租户 id，则此页代管该租户的校区（不再受当前登录租户限制） */
  tenantId?: number;
  /** 平台钻取时展示的租户名称 */
  tenantName?: string;
}

export default function OrgPage({ tenantId: propTenantId, tenantName }: OrgPageProps = {}) {
  const { message } = App.useApp();
  const isPlatform = propTenantId != null;
  const [tree, setTree] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const t = isPlatform
      ? await platformOrgTree(propTenantId as number).catch(() => [])
      : await orgTree().catch(() => []);
    setTree(t);
  };
  useEffect(() => {
    load();
    // 仅本机构（非平台钻取）模式才拉取当前机构名
    if (!isPlatform) {
      getTenantMe().then((t) => setLocalTenantName(t?.name || '')).catch(() => undefined);
    }
    /* eslint-disable-next-line */
  }, []);

  // 本机构模式下使用的机构名（平台钻取用外部传入的 tenantName）
  const [localTenantName, setLocalTenantName] = useState<string>('');
  const shownTenantName = isPlatform ? tenantName || String(propTenantId) : localTenantName;

  const toAntTree = (nodes: any[]): any[] =>
    nodes.map((n) => ({
      title: `${n.name}（${n.type}）`,
      key: String(n.id),
      children: n.children && n.children.length ? toAntTree(n.children) : undefined,
    }));

  const openCreate = (pid?: number) => { setEditing(null); setParentId(pid); form.resetFields(); form.setFieldsValue({ type: 'CAMPUS', status: 'ACTIVE' }); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    const payload = { ...v, parentId };
    setSubmitting(true);
    try {
      if (editing) {
        if (isPlatform) await platformUpdateOrg(propTenantId as number, editing.id, payload);
        else await updateOrg(editing.id, payload);
      } else {
        if (isPlatform) await platformCreateOrg(propTenantId as number, payload);
        else await createOrg(payload);
      }
      message.success('已保存');
      setOpen(false);
      load();
    } catch {
      // 失败提示由请求层统一处理
    } finally {
      setSubmitting(false);
    }
  };

  const title = isPlatform
    ? `代管「${shownTenantName}」校区（该租户即总校区）`
    : '本机构校区管理（组织架构）';

  return (
    <PageContainer title={title}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          isPlatform
            ? `正在平台侧代管「${shownTenantName}」的校区树（租户 = 总校区）`
            : `此处管理「${shownTenantName || '当前机构'}」自己的校区树`
        }
        description={
          isPlatform
            ? '平台管理员视角：可直接增删改该租户下的总部/分校/校区。每个租户仅一个总部(HQ)，校区数受品牌域「校区额度」限制。'
            : '按租户隔离：每个机构仅允许一个总部（HQ），可下设分校（BRANCH）与校区（CAMPUS）；校区总数受品牌域「校区额度」限制。登录时使用 用户名@品牌域（如 admin@acme）即可定位到本机构。'
        }
      />
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
            <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async (e) => { e?.stopPropagation(); if (isPlatform) await platformDeleteOrg(propTenantId as number, Number(n.key)); else await deleteOrg(Number(n.key)); message.success('已删除'); load(); }}>
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
