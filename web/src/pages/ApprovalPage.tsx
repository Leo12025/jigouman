import { useEffect, useState } from 'react';
import {
  Table, Tag, Space, Button, Modal, Input, Tabs, message, Select,
} from 'antd';
import { listApprovals, myApprovalTodos, approveApproval, rejectApproval } from '../api/crm';

const BIZ: Record<string, string> = {
  REFUND: '退款', CLASS_TRANSFER: '转班', LESSON_RESCHEDULE: '调课', DISCOUNT: '优惠',
};
const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已驳回', color: 'red' },
};

export default function ApprovalPage() {
  const [tab, setTab] = useState('todo');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [act, setAct] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      if (tab === 'todo') {
        const list = await myApprovalTodos();
        setRows(list); setTotal(list.length); setPage(p); setSize(s);
      } else {
        const res = await listApprovals({ page: p, size: s, status });
        setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(1, size); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, status]);

  const doAct = async () => {
    if (!act) return;
    try {
      if (act.action === 'approve') await approveApproval(act.id, comment);
      else await rejectApproval(act.id, comment);
      message.success(act.action === 'approve' ? '已通过' : '已驳回');
      setAct(null); setComment('');
      load();
    } catch { /* ignore */ }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '类型', dataIndex: 'bizType', width: 90, render: (v: string) => <Tag>{BIZ[v] || v}</Tag> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '发起人', dataIndex: 'applicantName', width: 100 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => (v ? new Date(v).toLocaleString() : '-') },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        r.status === 'PENDING' ? (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => { setAct({ id: r.id, action: 'approve' }); setComment(''); }}>通过</Button>
            <Button type="link" size="small" danger onClick={() => { setAct({ id: r.id, action: 'reject' }); setComment(''); }}>驳回</Button>
          </Space>
        ) : <span style={{ color: 'rgba(0,0,0,.35)' }}>—</span>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'todo', label: '我的待办' },
        { key: 'all', label: '审批台账' },
      ]} />
      {tab === 'all' && (
        <Space style={{ marginBottom: 12 }} wrap>
          <Select placeholder="状态" allowClear style={{ width: 130 }}
            options={Object.entries(STATUS).map(([v, o]) => ({ value: v, label: o.label }))}
            onChange={(v) => setStatus(v)} />
          <Button type="primary" onClick={() => load(1, size)}>查询</Button>
        </Space>
      )}
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={tab === 'all' ? { current: page, pageSize: size, total, showSizeChanger: true } : false}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={act?.action === 'approve' ? '审批通过' : '审批驳回'} open={!!act}
        onOk={doAct} onCancel={() => setAct(null)} okText="确认" cancelText="取消">
        <Input.TextArea rows={3} placeholder="审批意见（可选）" value={comment} onChange={(e) => setComment(e.target.value)} />
      </Modal>
    </div>
  );
}
