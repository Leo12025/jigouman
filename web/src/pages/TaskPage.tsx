import { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Select, Space, message, Popconfirm,
} from 'antd';
import { listTasks, completeTask, removeTask } from '../api/crm';

const TASK_TYPE: Record<string, { label: string; color: string }> = {
  AFTER_CLASS_REVIEW: { label: '课后点评', color: 'gold' },
};
const TASK_STATUS: Record<string, { label: string; color: string }> = {
  TODO: { label: '待办', color: 'orange' },
  DONE: { label: '已完成', color: 'green' },
};

export default function TaskPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();

  const load = async (p = page) => {
    const r = await listTasks({ page: p, size: 20, status, type });
    setRows(r.list); setTotal(r.total); setPage(p);
  };
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [status, type]);

  const cols = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag color={TASK_TYPE[v]?.color}>{TASK_TYPE[v]?.label || v}</Tag> },
    { title: '标题', dataIndex: 'title', width: 200 },
    { title: '负责人', dataIndex: 'assigneeId', width: 90 },
    { title: '关联', width: 120, render: (_: any, r: any) => (r.refType ? `${r.refType}#${r.refId}` : '-') },
    { title: '截止', dataIndex: 'dueAt', width: 150, render: (v: string) => (v ? new Date(v).toLocaleString() : '-') },
    {
      title: '状态', dataIndex: 'status', width: 160,
      render: (v: string, r: any) => (
        <Space size={2}>
          <Tag color={TASK_STATUS[v]?.color}>{TASK_STATUS[v]?.label}</Tag>
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
      <Space style={{ marginBottom: 12 }} wrap>
        <Select placeholder="状态" allowClear style={{ width: 120 }}
          options={Object.entries(TASK_STATUS).map(([v, o]) => ({ value: v, label: o.label }))}
          onChange={(v) => setStatus(v)} />
        <Select placeholder="类型" allowClear style={{ width: 140 }}
          options={Object.entries(TASK_TYPE).map(([v, o]) => ({ value: v, label: o.label }))}
          onChange={(v) => setType(v)} />
        <Button type="primary" onClick={() => load(1)}>查询</Button>
      </Space>
      <Table rowKey="id" size="small" dataSource={rows} columns={cols}
        pagination={{ current: page, pageSize: 20, total, onChange: load }} />
    </div>
  );
}
