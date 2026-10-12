import { useEffect, useState, useMemo } from 'react';
import { Table, Tag, Space, Button, Modal, Input, Tabs, Select, App } from 'antd';
import { listApprovals, myApprovalTodos, approveApproval, rejectApproval } from '../api/crm';
import { formatDateTime } from '../utils/format';

const BIZ: Record<string, string> = {
  REFUND: '退款', CLASS_TRANSFER: '转班', LESSON_RESCHEDULE: '调课', DISCOUNT: '优惠',
};
const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已驳回', color: 'red' },
};

export default function ApprovalPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState('todo');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [acting, setAct] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!acting) return;
    setSubmitting(true);
    try {
      if (acting.action === 'approve') await approveApproval(acting.id, comment);
      else await rejectApproval(acting.id, comment);
      message.success(acting.action === 'approve' ? '已通过' : '已驳回');
      setAct(null); setComment('');
      load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setSubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '类型', dataIndex: 'bizType', width: 90, render: (v: string) => <Tag>{BIZ[v] || v}</Tag> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '发起人', dataIndex: 'applicantName', width: 100 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => formatDateTime(v) },
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
  ], []);

  return (
    <div>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'todo', label: '待办' },
          { key: 'ledger', label: '台账' },
        ]}
      />
      <Space style={{ marginBottom: 12 }}>
        {tab === 'ledger' && (
          <Select
            placeholder="状态" allowClear style={{ width: 140 }}
            value={status} onChange={setStatus}
            options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        )}
        <Button onClick={() => load()}>刷新</Button>
      </Space>
      <Table
        rowKey="id" loading={loading} dataSource={rows} columns={columns}
        pagination={tab === 'todo' ? false : { current: page, total, pageSize: size, onChange: (p, s) => load(p, s?.pageSize || size) }}
        size="small"
      />
      <Modal
        title={acting ? (acting.action === 'approve' ? '通过审批' : '驳回审批') : ''}
        open={!!acting} confirmLoading={submitting}
        onOk={doAct} onCancel={() => { setAct(null); setComment(''); }} okText="确认" cancelText="取消"
      >
        <Input.TextArea
          placeholder="审批意见（可选）"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </div>
  );
}
