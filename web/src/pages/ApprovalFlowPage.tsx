import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Select, Switch, Tag, Popconfirm, Card, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
  listApprovalFlows, createApprovalFlow, updateApprovalFlow, deleteApprovalFlow,
  listAllUsers, listRoles, seedApprovalFlows,
} from '../api/crm';

const BIZ_TYPE_OPTIONS = [
  'STORED_VALUE_RECHARGE', 'STORED_VALUE_REFUND', 'REFUND',
  'LESSON_RESCHEDULE', 'CLASS_TRANSFER', 'PACKAGE_UPGRADE', 'DISCOUNT',
].map((v) => ({ value: v, label: v }));

interface NodeRow {
  name: string;
  approverType: 'USER' | 'ROLE';
  approverId?: number;
  approverRole?: string;
  /** AND=会签(全部通过才推进) / OR=或签(任一通过即推进)，默认 OR */
  mode?: 'AND' | 'OR';
}

export default function ApprovalFlowPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [bizType, setBizType] = useState('');
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await listApprovalFlows({ page: 1, size: 100 });
      setRows(r.list || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    listAllUsers().then((r) => setUsers(r.list || [])).catch(() => undefined);
    listRoles().then(setRoles).catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setBizType(''); setName(''); setEnabled(true); setNodes([]);
    setOpen(true);
  };

  const openEdit = (rec: any) => {
    setEditing(rec);
    setBizType(rec.bizType); setName(rec.name); setEnabled(!!rec.enabled);
    setNodes((rec.nodesJson || []).map((n: any) => ({
      name: n.name,
      approverType: n.approverType,
      approverId: n.approverId,
      approverRole: n.approverRole,
      mode: n.mode || 'OR',
    })));
    setOpen(true);
  };

  const addNode = () =>
    setNodes([...nodes, { name: `节点${nodes.length + 1}`, approverType: 'USER', approverId: undefined, approverRole: undefined, mode: 'OR' }]);

  const updateNode = (i: number, patch: Partial<NodeRow>) =>
    setNodes(nodes.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));

  const removeNode = (i: number) => setNodes(nodes.filter((_, idx) => idx !== i));

  const moveNode = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= nodes.length) return;
    const copy = [...nodes];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setNodes(copy);
  };

  const save = async () => {
    if (!bizType.trim()) return message.warning('请填写业务类型');
    if (!name.trim()) return message.warning('请填写审批流名称');
    if (!nodes.length) return message.warning('至少配置一个节点');
    for (const n of nodes) {
      if (!n.name.trim()) return message.warning('节点名称不能为空');
      if (n.approverType === 'USER' && !n.approverId) return message.warning(`节点「${n.name}」需选择审批人`);
      if (n.approverType === 'ROLE' && !n.approverRole) return message.warning(`节点「${n.name}」需选择审批角色`);
    }
    const payload = {
      bizType: bizType.trim(),
      name: name.trim(),
      enabled,
      nodes: nodes.map((n, i) => ({
        order: i,
        name: n.name.trim(),
        approverType: n.approverType,
        approverId: n.approverType === 'USER' ? n.approverId : undefined,
        approverRole: n.approverType === 'ROLE' ? n.approverRole : undefined,
        mode: n.mode || 'OR',
      })),
    };
    setSaving(true);
    try {
      if (editing) await updateApprovalFlow(editing.id, payload);
      else await createApprovalFlow(payload);
      message.success('已保存');
      setOpen(false);
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    try { await deleteApprovalFlow(id); message.success('已删除'); await load(); }
    catch { /* ignore */ }
  };

  const [seeding, setSeeding] = useState(false);
  const onSeed = async () => {
    setSeeding(true);
    try {
      const created = await seedApprovalFlows();
      if (created.length) message.success(`已预置 ${created.length} 条资金联动审批流模板`);
      else message.info('预置模板已存在，无需重复创建');
      await load();
    } finally { setSeeding(false); }
  };

  const userOpts = useMemo(() => users.map((u) => ({ value: u.id, label: u.name || u.username })), [users]);
  const roleOpts = useMemo(() => roles.map((r) => ({ value: r.code, label: r.name })), [roles]);

  const cols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '业务类型', dataIndex: 'bizType', width: 120 },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '状态', dataIndex: 'enabled', width: 80,
      render: (v: number) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '节点数', width: 80,
      render: (_: any, r: any) => (r.nodesJson || []).length,
    },
    {
      title: '节点(模式)', width: 220,
      render: (_: any, r: any) => (r.nodesJson || []).map((n: any, idx: number) => (
        <Tag key={idx} color={n.mode === 'AND' ? 'purple' : 'default'}>
          {n.name}/{n.mode === 'AND' ? '会签' : '或签'}
        </Tag>
      )),
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <PageContainer title="审批流配置">
      <Card
        size="small"
        title="审批流模板配置（§4.16 增强）"
        extra={
          <Space>
            <Button icon={<PlusOutlined />} loading={seeding} onClick={onSeed}>初始化预置模板</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建审批流</Button>
          </Space>
        }
      >
        <Table rowKey="id" size="small" dataSource={rows} columns={cols} pagination={false}  scroll={{ x: 'max-content' }} />
      </Card>

      <Modal
        title={editing ? '编辑审批流' : '新建审批流'}
        open={open}
        onOk={save}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form layout="vertical">
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item label="业务类型" required style={{ flex: 1 }}>
              <Select
                value={bizType || undefined} onChange={(v) => setBizType(v || '')} showSearch
                options={BIZ_TYPE_OPTIONS} placeholder="如 REFUND / STORED_VALUE_RECHARGE"
              />
            </Form.Item>
            <Form.Item label="名称" required style={{ flex: 1 }}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 退费审批流" />
            </Form.Item>
            <Form.Item label="启用">
              <Switch checked={enabled} onChange={setEnabled} />
            </Form.Item>
          </Space>

          <div style={{ marginBottom: 8, fontWeight: 600 }}>审批节点（按顺序逐级审批）</div>
          {nodes.map((n, i) => (
            <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="baseline" wrap>
              <Tag color="blue">{i + 1}</Tag>
              <Input style={{ width: 140 }} placeholder="节点名" value={n.name}
                onChange={(e) => updateNode(i, { name: e.target.value })} />
              <Select style={{ width: 110 }} value={n.approverType}
                onChange={(v) => updateNode(i, { approverType: v })}
                options={[{ value: 'USER', label: '指定用户' }, { value: 'ROLE', label: '指定角色' }]} />
              {n.approverType === 'USER' ? (
                <Select style={{ width: 160 }} placeholder="审批人" value={n.approverId}
                  onChange={(v) => updateNode(i, { approverId: v })} options={userOpts} showSearch
                  optionFilterProp="label" />
              ) : (
                <Select style={{ width: 160 }} placeholder="审批角色" value={n.approverRole}
                  onChange={(v) => updateNode(i, { approverRole: v })} options={roleOpts} />
              )}
              <Select style={{ width: 100 }} value={n.mode || 'OR'}
                onChange={(v) => updateNode(i, { mode: v })}
                options={[{ value: 'OR', label: '或签' }, { value: 'AND', label: '会签' }]} />
              <Button type="text" icon={<ArrowUpOutlined />} disabled={i === 0}
                onClick={() => moveNode(i, -1)} />
              <Button type="text" icon={<ArrowDownOutlined />} disabled={i === nodes.length - 1}
                onClick={() => moveNode(i, 1)} />
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeNode(i)} />
            </Space>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={addNode} block>添加节点</Button>
        </Form>
      </Modal>
    </PageContainer>
  );
}
