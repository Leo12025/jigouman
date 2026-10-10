import { useEffect, useState } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag, Card } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listDistributors, createDistributor, updateDistributor, deleteDistributor, distributorTree,
  recordCommission, listCommissions, settleCommission, distributionStats,
} from '../api/crm';

const STATUS_COLOR: Record<string, string> = { ACTIVE: 'green', INACTIVE: 'default' };

export default function DistributionPage() {
  const [dists, setDists] = useState<any[]>([]);
  const [distTotal, setDistTotal] = useState(0);
  const [distOpen, setDistOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [distForm] = Form.useForm();

  const [comms, setComms] = useState<any[]>([]);
  const [commDistId, setCommDistId] = useState<number | undefined>();
  const [commOpen, setCommOpen] = useState(false);
  const [commForm] = Form.useForm();
  const [stats, setStats] = useState<any>(null);

  const loadDists = async () => {
    const r = await listDistributors({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setDists(r.list); setDistTotal(r.total);
  };
  const loadComms = async (distributorId: number) => {
    setCommDistId(distributorId);
    const r = await listCommissions(distributorId).catch(() => []);
    setComms(r);
    const s = await distributionStats().catch(() => null);
    setStats(s);
  };
  useEffect(() => { loadDists(); /* eslint-disable-next-line */ }, []);

  const distCols = [
    { title: '姓名', dataIndex: 'name' },
    { title: '邀请码', dataIndex: 'inviteCode' },
    { title: '等级', dataIndex: 'level' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag> },
    { title: '上级ID', dataIndex: 'parentId', render: (v: number) => v || '-' },
    { title: '操作', width: 160, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setEditing(r); distForm.resetFields(); distForm.setFieldsValue(r); setDistOpen(true); }}>编辑</Button>
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteDistributor(r.id); message.success('已删除'); loadDists(); }}><Button type="link" danger size="small">删除</Button></Popconfirm>
      </Space>
    ) },
  ];

  const commCols = [
    { title: 'ID', dataIndex: 'id' },
    { title: '金额', dataIndex: 'amount' },
    { title: '订单ID', dataIndex: 'orderId', render: (v: number) => v || '-' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'SETTLED' ? 'green' : v === 'CANCELLED' ? 'red' : 'gold'}>{v}</Tag> },
    { title: '操作', width: 140, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" disabled={r.status === 'SETTLED'} onClick={async () => { await settleCommission(r.id, 'SETTLED'); message.success('已结算'); if (commDistId) loadComms(commDistId); }}>结算</Button>
        <Button type="link" size="small" danger disabled={r.status === 'CANCELLED'} onClick={async () => { await settleCommission(r.id, 'CANCELLED'); message.success('已作废'); if (commDistId) loadComms(commDistId); }}>作废</Button>
      </Space>
    ) },
  ];

  return (
    <div>
      <Tabs items={[
        {
          key: 'dist', label: '分销员',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<ReloadOutlined />} onClick={loadDists}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); distForm.resetFields(); distForm.setFieldsValue({ status: 'ACTIVE', level: 1 }); setDistOpen(true); }}>新增分销员</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={dists} columns={distCols} pagination={{ total: distTotal }} />
          </>,
        },
        {
          key: 'comm', label: '佣金管理',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <span>分销员：</span>
              <Select style={{ width: 220 }} placeholder="选择分销员" value={commDistId} onChange={loadComms} options={dists.map((d) => ({ value: d.id, label: `${d.name}(${d.inviteCode})` }))} />
              <Button icon={<ReloadOutlined />} onClick={() => commDistId && loadComms(commDistId)}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} disabled={!commDistId} onClick={() => { commForm.resetFields(); commForm.setFieldsValue({ amount: 0 }); setCommOpen(true); }}>登记佣金</Button>
            </Space>
            {stats && (
              <Card size="small" style={{ marginBottom: 12 }}>
                佣金汇总：总额 {stats.total} ｜ 待结算 {stats.byStatus.PENDING || 0} ｜ 已结算 {stats.byStatus.SETTLED || 0} ｜ 已作废 {stats.byStatus.CANCELLED || 0}
              </Card>
            )}
            <Table rowKey="id" size="small" dataSource={comms} columns={commCols} pagination={false} />
          </>,
        },
      ]} />

      <Modal title={editing ? '编辑分销员' : '新增分销员'} open={distOpen} onOk={async () => {
        const v = await distForm.validateFields();
        if (editing) await updateDistributor(editing.id, v); else await createDistributor(v);
        message.success('已保存'); setDistOpen(false); loadDists();
      }} onCancel={() => setDistOpen(false)} okText="保存" cancelText="取消">
        <Form form={distForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input /></Form.Item>
          <Form.Item name="parentId" label="上级分销员ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="level" label="等级" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'INACTIVE', label: '停用' }]} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="登记佣金" open={commOpen} onOk={async () => {
        const v = await commForm.validateFields();
        await recordCommission({ ...v, distributorId: commDistId });
        message.success('已登记'); setCommOpen(false); if (commDistId) loadComms(commDistId);
      }} onCancel={() => setCommOpen(false)} okText="保存" cancelText="取消">
        <Form form={commForm} layout="vertical">
          <Form.Item name="amount" label="佣金金额" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
          <Form.Item name="orderId" label="关联订单ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
