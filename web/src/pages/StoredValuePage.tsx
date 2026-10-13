import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, Tabs, Space, Tag, App, Input, Descriptions, Statistic,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  listStoredValueAccounts, listStoredValueLedgers,
  rechargeStoredValue, consumeStoredValue, refundStoredValue, getStoredValueBalance,
} from '../api/crm';
import { withComplianceConfirm } from '../api/client';

const TYPE_TAG: Record<string, { color: string; text: string }> = {
  RECHARGE: { color: 'green', text: '充值' },
  GIFT: { color: 'gold', text: '赠送' },
  CONSUME: { color: 'red', text: '消费' },
  REFUND: { color: 'blue', text: '退回' },
  EXPIRE: { color: 'default', text: '过期清零' },
};

export default function StoredValuePage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accTotal, setAccTotal] = useState(0);
  const [accPage, setAccPage] = useState(1);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [ledTotal, setLedTotal] = useState(0);
  const [ledPage, setLedPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [opOpen, setOpOpen] = useState(false);
  const [opType, setOpType] = useState<'recharge' | 'consume' | 'refund'>('recharge');
  const [opForm] = Form.useForm();
  const [opSubmitting, setOpSubmitting] = useState(false);

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [balanceId, setBalanceId] = useState<number>();

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const r: any = await listStoredValueAccounts({ page: accPage, size: 20 });
      setAccounts(r.list || []);
      setAccTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  const loadLedgers = async () => {
    setLoading(true);
    try {
      const r: any = await listStoredValueLedgers({ page: ledPage, size: 20 });
      setLedgers(r.list || []);
      setLedTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); loadLedgers(); }, [accPage, ledPage]);

  const openOp = (type: 'recharge' | 'consume' | 'refund', studentId?: number) => {
    setOpType(type);
    opForm.resetFields();
    opForm.setFieldsValue({ studentId });
    setOpOpen(true);
  };
  const onOp = async () => {
    const v = await opForm.validateFields();
    setOpSubmitting(true);
    try {
      if (opType === 'recharge') {
        // 合规二次确认：储值属预收费，单次充值超 5000 需确认后继续
        await withComplianceConfirm((extra) => rechargeStoredValue({ ...v, ...extra }));
      } else if (opType === 'consume') await consumeStoredValue(v);
      else await refundStoredValue(v);
      message.success(opType === 'recharge' ? '充值成功' : opType === 'consume' ? '消费成功' : '已退回储值');
      setOpOpen(false);
      loadAccounts();
      loadLedgers();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setOpSubmitting(false); }
  };

  const viewBalance = async (studentId: number) => {
    setBalanceId(studentId);
    const r = await getStoredValueBalance(studentId).catch(() => null);
    setBalance(r);
    setBalanceOpen(true);
  };

  const accColumns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '学员ID', dataIndex: 'studentId', width: 100 },
    {
      title: '可用余额', dataIndex: 'balance', width: 120,
      render: (v: number) => <b>¥{Number(v || 0).toFixed(2)}</b>,
    },
    {
      title: '其中赠送', dataIndex: 'giftBalance', width: 110,
      render: (v: number) => (Number(v) > 0 ? <Tag color="gold">¥{Number(v).toFixed(2)}</Tag> : '-'),
    },
    { title: '累计充值', dataIndex: 'totalRecharged', width: 110, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    { title: '累计赠送', dataIndex: 'totalGift', width: 110, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    { title: '累计消费', dataIndex: 'totalUsed', width: 110, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s === 'ACTIVE' ? '正常' : s}</Tag>,
    },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Space wrap>
          <Button size="small" onClick={() => viewBalance(r.studentId)}>余额</Button>
          <Button size="small" type="primary" onClick={() => openOp('recharge', r.studentId)}>充值</Button>
          <Button size="small" onClick={() => openOp('consume', r.studentId)}>消费</Button>
          <Button size="small" onClick={() => openOp('refund', r.studentId)}>退回</Button>
        </Space>
      ),
    },
  ];

  const ledColumns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '学员ID', dataIndex: 'studentId', width: 100 },
    {
      title: '类型', dataIndex: 'type', width: 100,
      render: (t: string) => <Tag color={TYPE_TAG[t]?.color}>{TYPE_TAG[t]?.text || t}</Tag>,
    },
    {
      title: '金额', dataIndex: 'amount', width: 110,
      render: (v: number) => (
        <span style={{ color: Number(v) >= 0 ? '#3f8600' : '#cf1322' }}>
          {Number(v) >= 0 ? '+' : ''}{Number(v).toFixed(2)}
        </span>
      ),
    },
    { title: '赠送', dataIndex: 'giftAmount', width: 90, render: (v: number) => (Number(v) ? Number(v).toFixed(2) : '-') },
    { title: '变动后余额', dataIndex: 'balanceAfter', width: 120, render: (v: number) => Number(v).toFixed(2) },
    { title: '关联订单', dataIndex: 'refOrderId', width: 100, render: (v: number) => v ?? '-' },
    { title: '备注', dataIndex: 'remark' },
  ];

  return (
    <PageContainer title="储值卡管理">
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => openOp('recharge')}>储值充值</Button>
        <Button onClick={() => openOp('consume')}>储值消费</Button>
        <Button onClick={() => openOp('refund')}>退费退回储值</Button>
      </Space>

      <Tabs
        defaultActiveKey="accounts"
        items={[
          {
            key: 'accounts',
            label: '储值账户',
            children: (
              <Table
                rowKey="id" loading={loading} dataSource={accounts} columns={accColumns}
                pagination={{ current: accPage, total: accTotal, pageSize: 20, onChange: setAccPage }}
                size="small" scroll={{ x: 'max-content' }}
              />
            ),
          },
          {
            key: 'ledgers',
            label: '储值流水',
            children: (
              <Table
                rowKey="id" loading={loading} dataSource={ledgers} columns={ledColumns}
                pagination={{ current: ledPage, total: ledTotal, pageSize: 20, onChange: setLedPage }}
                size="small" scroll={{ x: 'max-content' }}
              />
            ),
          },
        ]}
      />

      <Modal
        title={opType === 'recharge' ? '储值充值' : opType === 'consume' ? '储值消费' : '退费退回储值'}
        open={opOpen} confirmLoading={opSubmitting} onOk={onOp} onCancel={() => setOpOpen(false)}
        okText="确定"
      >
        <Form form={opForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '请输入学员ID' }]}>
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="amount" label={opType === 'recharge' ? '充值本金' : '金额'} rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} style={{ width: 200 }} addonBefore="¥" />
          </Form.Item>
          {opType === 'recharge' && (
            <Form.Item name="giftAmount" label="赠送金额" tooltip="如充 5000 送 500；赠送部分不提现、退费时不退">
              <InputNumber min={0} style={{ width: 200 }} addonBefore="¥" />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={balanceOpen} onCancel={() => setBalanceOpen(false)} footer={null} title={`学员 #${balanceId} 储值余额`}>
        {balance && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="可用余额">¥{Number(balance.balance || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="其中赠送">¥{Number(balance.giftBalance || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="累计充值">¥{Number(balance.totalRecharged || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="累计赠送">¥{Number(balance.totalGift || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="累计消费">¥{Number(balance.totalUsed || 0).toFixed(2)}</Descriptions.Item>
            </Descriptions>
            <Statistic title="可退金额（本金口径，赠送不退）" value={Number(balance.balance || 0) - Number(balance.giftBalance || 0)} precision={2} prefix="¥" />
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
