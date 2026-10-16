import { useEffect, useState, useMemo } from 'react';
import { Table, Tag, Space, Button, Modal, Input, Tabs, Select, App, Drawer, Descriptions, Alert, Divider } from 'antd';
import PageContainer from '../components/PageContainer';
import { listApprovals, myApprovalTodos, approveApproval, rejectApproval, getApproval } from '../api/crm';
import { formatDateTime } from '../utils/format';

const BIZ: Record<string, string> = {
  REFUND: '订单退款',
  CLASS_TRANSFER: '转班',
  LESSON_RESCHEDULE: '调课',
  DISCOUNT: '优惠',
  PACKAGE_UPGRADE: '套餐升级补差价',
  STORED_VALUE_RECHARGE: '储值充值',
  STORED_VALUE_REFUND: '储值退回',
};
const BIZ_COLOR: Record<string, string> = {
  REFUND: 'volcano', CLASS_TRANSFER: 'geekblue', LESSON_RESCHEDULE: 'blue',
  DISCOUNT: 'purple', PACKAGE_UPGRADE: 'magenta',
  STORED_VALUE_RECHARGE: 'green', STORED_VALUE_REFUND: 'cyan',
};
const BIZ_OPTIONS = Object.entries(BIZ).map(([value, label]) => ({ value, label }));
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
  const [bizType, setBizType] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [acting, setAct] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      setDetailOpen(false); setDetail(null);
      load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setSubmitting(false); }
  };

  const openDetail = async (r: any) => {
    try {
      const d = await getApproval(r.id);
      setDetail(d);
    } catch {
      setDetail(r);
    }
    setDetailOpen(true);
  };

  const filteredRows = useMemo(
    () => (bizType ? rows.filter((r) => r.bizType === bizType) : rows),
    [rows, bizType],
  );

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '类型', dataIndex: 'bizType', width: 110, render: (v: string) => <Tag color={BIZ_COLOR[v]}>{BIZ[v] || v}</Tag> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '发起人', dataIndex: 'applicantName', width: 100 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => formatDateTime(v) },
    {
      title: '操作', width: 200, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openDetail(r)}>详情</Button>
          {r.status === 'PENDING' ? (
            <>
              <Button type="link" size="small" onClick={() => { setAct({ id: r.id, action: 'approve' }); setComment(''); }}>通过</Button>
              <Button type="link" size="small" danger onClick={() => { setAct({ id: r.id, action: 'reject' }); setComment(''); }}>驳回</Button>
            </>
          ) : <span style={{ color: 'rgba(0,0,0,.35)' }}>—</span>}
        </Space>
      ),
    },
  ], []);

  return (
    <PageContainer title="审批中心">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'todo', label: '待办' },
          { key: 'ledger', label: '台账' },
        ]}
      />
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          placeholder="业务类型" allowClear style={{ width: 160 }}
          value={bizType} onChange={(v) => setBizType(v || undefined)}
          options={BIZ_OPTIONS}
        />
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
        rowKey="id" loading={loading} dataSource={filteredRows} columns={columns}
        pagination={tab === 'todo' ? false : { current: page, total, pageSize: size, onChange: (p, s) => load(p, s || size) }}
        size="small"
       scroll={{ x: 'max-content' }} />
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

      <Drawer title="审批详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={480}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="类型">
              <Tag color={BIZ_COLOR[detail.bizType]}>{BIZ[detail.bizType] || detail.bizType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="业务单据ID">{detail.bizId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="发起人">{detail.applicantName || detail.applicantId}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(detail.createdAt)}</Descriptions.Item>
          </Descriptions>
        )}
        {detail?.nodes && detail.nodes.length > 0 && (
          <>
            <Divider orientation="left" size="small">审批节点进度</Divider>
            <Table
              size="small" rowKey="nodeKey" pagination={false}
              dataSource={detail.nodes}
              columns={[
                { title: '节点', dataIndex: 'nodeKey', width: 70, render: (v: number) => `第${v + 1}级` },
                {
                  title: '模式', dataIndex: 'mode', width: 80,
                  render: (m: string) => <Tag color={m === 'AND' ? 'purple' : 'default'}>{m === 'AND' ? '会签' : '或签'}</Tag>,
                },
                {
                  title: '进度', width: 90,
                  render: (_: any, n: any) => `${n.actedUserIds?.length || 0} / ${n.approverIdsJson?.length || 0}`,
                },
                {
                  title: '状态', dataIndex: 'action', width: 90,
                  render: (a: string) =>
                    a === 'APPROVE' ? <Tag color="green">已通过</Tag>
                      : a === 'REJECT' ? <Tag color="red">已驳回</Tag>
                        : <Tag color="orange">待审</Tag>,
                },
              ]}
            />
          </>
        )}
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="资金联动说明"
          description="通过后将由系统事件总线自动回写业务（储值充值/退回、订单退款、调课、转班、套餐升级补差价等）；驳回不改变任何账务。请在审批前核实业务真实性。"
        />
      </Drawer>
    </PageContainer>
  );
}
