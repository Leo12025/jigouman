import { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Select, Space, message, Popconfirm, Card, Row, Col, Radio,
} from 'antd';
import {
  listTasks, getMyTodos, getTaskStats, completeTask, removeTask, TASK_TYPE_LABELS,
} from '../api/crm';

const STATUS_OPTS = [
  { value: 'TODO', label: '待办' },
  { value: 'DONE', label: '已完成' },
];

export default function TaskPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<string | undefined>('TODO');
  const [type, setType] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

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
    return <span style={{ color: 'rgba(0,0,0,.45)' }}>剩 {r.overdueHours}h</span>;
  };

  const cols = [
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
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    { title: '逾期', width: 130, render: overdueRender },
    {
      title: '状态', dataIndex: 'status', width: 160,
      render: (v: string, r: any) => (
        <Space size={2}>
          <Tag color={v === 'TODO' ? 'orange' : 'green'}>{v === 'TODO' ? '待办' : '已完成'}</Tag>
          {v === 'TODO' && (
            <>
              <Button type="link" size="small" onClick={async () => { await completeTask(r.id); message.success('已完成'); load(); }}>完成</Button>
              <Popconfirm title="删除?" onConfirm={async () => { await removeTask(r.id); message.success('已删除'); load(); }}>
                <Button type="link" size="small" danger>删</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'rgba(0,0,0,.45)' }}>总待办</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats?.total ?? '-'}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'rgba(0,0,0,.45)' }}>逾期</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fa541c' }}>{stats?.overdue ?? '-'}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ color: 'rgba(0,0,0,.45)' }}>严重逾期</div>
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
                <span style={{ color: 'rgba(0,0,0,.45)' }}>暂无</span>
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
      </Space>
      <Table rowKey="id" size="small" dataSource={rows} columns={cols}
        pagination={{ current: page, pageSize: 20, total, onChange: load }} />
    </div>
  );
}
