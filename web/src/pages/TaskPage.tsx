import { theme } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Tag, Select, Space, Popconfirm, Card, Row, Col, Radio, Modal, Input, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { AuditOutlined } from '@ant-design/icons';
import {
  listTasks, getMyTodos, getTaskStats, completeTask, removeTask,
  approveApproval, rejectApproval, createApproval,
  listApprovalFlows, listAllUsers, TASK_TYPE_LABELS,
} from '../api/crm';
import { formatDateTime } from '../utils/format';

const STATUS_OPTS = [
  { value: 'TODO', label: '待办' },
  { value: 'DONE', label: '已完成' },
];

export default function TaskPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<string | undefined>('TODO');
  const [type, setType] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  // 发起审批
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [flows, setFlows] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [bizType, setBizType] = useState('REFUND');
  const [title, setTitle] = useState('');
  const [flowId, setFlowId] = useState<number | undefined>();
  const [approverIds, setApproverIds] = useState<number[]>([]);

  const openCreate = async () => {
    setFlowId(undefined); setApproverIds([]); setTitle(''); setBizType('REFUND');
    try {
      const f = await listApprovalFlows({ page: 1, size: 100 });
      setFlows(f.list || []);
      const u = await listAllUsers();
      setAllUsers(u.list || []);
    } catch { /* ignore */ }
    setCreateOpen(true);
  };

  const submitApproval = async () => {
    if (!title.trim()) return message.warning('请填写审批标题');
    if (!flowId && !approverIds.length) return message.warning('请选择审批流或手动指定审批人');
    setCreateSubmitting(true);
    try {
      await createApproval({
        bizType, title: title.trim(),
        ...(flowId ? { flowId } : { approverIds }),
      });
      message.success('审批已发起');
      setCreateOpen(false);
      load(1);
    } finally { setCreateSubmitting(false); }
  };

  const load = async (p = page) => {
    const params: any = { page: p, size: 20, status, type };
    if (overdueOnly) params.overdue = 1;
    const r = scope === 'mine' ? await getMyTodos(params) : await listTasks(params);
    setRows(r.list); setTotal(r.total); setPage(p);
  };

  useEffect(() => {
    getTaskStats().then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [scope, status, type, overdueOnly]);

  const typeRender = (v: string) => {
    const m = TASK_TYPE_LABELS[v] || { label: v, color: 'default' };
    return <Tag color={m.color}>{m.label}</Tag>;
  };

  const overdueRender = (_: any, r: any) => {
    if (r.overdueHours == null) return <span>-</span>;
    if (r.overdue) {
      return (
        <Tag color={r.severeOverdue ? 'red' : 'volcano'}>
          {r.severeOverdue ? '严重逾期' : '逾期'} {r.overdueHours}h
        </Tag>
      );
    }
    return <span style={{ color: 'token.colorTextSecondary' }}>剩 {r.overdueHours}h</span>;
  };

  const cols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '类型', dataIndex: 'type', width: 100, render: typeRender },
    { title: '标题', dataIndex: 'title', width: 200 },
    { title: '负责人', dataIndex: 'assigneeId', width: 90 },
    {
      title: '关联', width: 120,
      render: (_: any, r: any) => (r.refType ? `${r.refType}#${r.refId}` : '-'),
    },
    {
      title: '截止', dataIndex: 'dueAt', width: 150,
      render: (v: string) => formatDateTime(v),
    },
    { title: '逾期', width: 130, render: overdueRender },
    {
      title: '状态', dataIndex: 'status', width: 160,
      render: (v: string, r: any) => (
        <Space size={2}>
          <Tag color={v === 'TODO' ? 'orange' : 'green'}>{v === 'TODO' ? '待办' : '已完成'}</Tag>
          {v === 'TODO' && (
            <>
              {r.type === 'APPROVAL' ? (
                <>
                  <Button type="link" size="small" onClick={async () => { await approveApproval(r.refId); message.success('已通过'); load(); }}>通过</Button>
                  <Popconfirm title="确认驳回?" onConfirm={async () => { await rejectApproval(r.refId); message.success('已驳回'); load(); }}>
                    <Button type="link" size="small" danger>驳回</Button>
                  </Popconfirm>
                </>
              ) : (
                <Button type="link" size="small" onClick={async () => { await completeTask(r.id); message.success('已完成'); load(); }}>完成</Button>
              )}
              <Popconfirm title="删除?" onConfirm={async () => { await removeTask(r.id); message.success('已删除'); load(); }}>
                <Button type="link" size="small" danger>删</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], []);

  return (
    <PageContainer title="待办中心">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'token.colorTextSecondary' }}>总待办</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats?.total ?? '-'}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'token.colorTextSecondary' }}>逾期</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fa541c' }}>{stats?.overdue ?? '-'}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'token.colorTextSecondary' }}>严重逾期</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#cf1322' }}>{stats?.severeOverdue ?? '-'}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" title="按类型分布">
            <Space wrap size={4}>
              {(stats?.byType || []).map((b: any) => (
                <Tag key={b.type} color={TASK_TYPE_LABELS[b.type]?.color}>{b.label} {b.count}</Tag>
              ))}
              {(!stats?.byType || stats.byType.length === 0) && (
                <span style={{ color: 'token.colorTextSecondary' }}>暂无</span>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
      <Space style={{ marginBottom: 12 }} wrap>
        <Radio.Group
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[{ label: '我的待办', value: 'mine' }, { label: '全部', value: 'all' }]}
        />
        <Select placeholder="状态" allowClear style={{ width: 120 }}
          options={STATUS_OPTS} value={status} onChange={(v) => setStatus(v)} />
        <Select placeholder="类型" allowClear style={{ width: 140 }}
          options={Object.entries(TASK_TYPE_LABELS).map(([v, o]) => ({ value: v, label: o.label }))}
          value={type} onChange={(v) => setType(v)} />
        <Select placeholder="逾期" allowClear style={{ width: 120 }}
          options={[{ value: true, label: '仅逾期' }]}
          value={overdueOnly || undefined} onChange={(v) => setOverdueOnly(!!v)} />
        <Button type="primary" onClick={() => load(1)}>查询</Button>
        <Button type="primary" icon={<AuditOutlined />} onClick={openCreate}>发起审批</Button>
      </Space>
      <Table rowKey="id" size="small" dataSource={rows} columns={cols}
        pagination={{ current: page, pageSize: 20, total, onChange: load }} />

      <Modal title="发起审批" open={createOpen} confirmLoading={createSubmitting} onOk={submitApproval} onCancel={() => setCreateOpen(false)}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 4 }}>业务类型</div>
            <Input value={bizType} onChange={(e) => setBizType(e.target.value)} placeholder="如 REFUND / TRANSFER / DISCOUNT" />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>审批标题</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如 退费审批-张三" />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>选择审批流模板（留空则手动指定审批人）</div>
            <Select style={{ width: '100%' }} allowClear placeholder="可选：套用已配置审批流"
              value={flowId} onChange={(v) => setFlowId(v)} showSearch optionFilterProp="label"
              options={flows.map((f) => ({ value: f.id, label: `${f.name}（${f.bizType}）` }))} />
          </div>
          {!flowId && (
            <div>
              <div style={{ marginBottom: 4 }}>手动指定审批人（按顺序逐级）</div>
              <Select style={{ width: '100%' }} mode="multiple" placeholder="选择审批人"
                value={approverIds} onChange={(v) => setApproverIds(v)} showSearch optionFilterProp="label"
                options={allUsers.map((u) => ({ value: u.id, label: u.name || u.username }))} />
            </div>
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
}
