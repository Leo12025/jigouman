import { theme } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import {
  Tabs, Table, Button, Tag, Modal, Form, InputNumber, Input, Select, Card, Row, Col, Statistic, Space, App, Alert,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  getSplitConfig, upsertSplitConfig, listSplits, settleSplits,
  generateSalary, listSalary, confirmSalary, paySalary,
  applyInvoice, issueInvoice, listInvoices, financeSummary,
  listStudents, listCourses, financeReconcile,
} from '../api/crm';

const SPLIT_TYPE: Record<string, { label: string; color: string }> = {
  TEACHER_COMMISSION: { label: '教师提成', color: 'blue' },
  CHANNEL_SPLIT: { label: '渠道分成', color: 'purple' },
};
const SPLIT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待结算', color: 'orange' },
  SETTLED: { label: '已结算', color: 'green' },
};
const SALARY_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  CONFIRMED: { label: '已确认', color: 'blue' },
  PAID: { label: '已发放', color: 'green' },
};
const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  APPLIED: { label: '待开具', color: 'orange' },
  ISSUED: { label: '已开具', color: 'green' },
};

export default function FinancePage() {
  const { token } = theme.useToken();
  return (
    <PageContainer title="财务对账">
    <Tabs
      defaultActiveKey="split"
      items={[
        { key: 'split', label: '分账 / 工资', children: <SplitTab /> },
        { key: 'invoice', label: '发票', children: <InvoiceTab /> },
        { key: 'report', label: '财务报表', children: <ReportTab /> },
        { key: 'reconcile', label: 'AI 智能对账', children: <ReconcileTab /> },
      ]}
    />
    </PageContainer>
  );
}

function SplitTab() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [cfg, setCfg] = useState<any>(null);
  const [splits, setSplits] = useState<any[]>([]);
  const [salary, setSalary] = useState<any[]>([]);
  const [totalS, setTotalS] = useState(0);
  const [totalSa, setTotalSa] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgForm] = Form.useForm();
  const [cfgSubmitting, setCfgSubmitting] = useState(false);

  const load = async () => {
    const [s, sa, c] = await Promise.all([
      listSplits({ page, size: 20, period }),
      listSalary({ page: 1, size: 100, period }),
      getSplitConfig(),
    ]);
    setSplits(s.list); setTotalS(s.total);
    setSalary(sa.list); setTotalSa(sa.total);
    setCfg(c);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, period]);

  const openCfg = () => {
    cfgForm.setFieldsValue({ teacherRate: cfg?.teacherRate, channelRate: cfg?.channelRate, bonusRate: cfg?.bonusRate });
    setCfgOpen(true);
  };
  const submitCfg = async () => {
    const v = await cfgForm.validateFields();
    setCfgSubmitting(true);
    try { await upsertSplitConfig(v); message.success('分账配置已更新'); setCfgOpen(false); load(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setCfgSubmitting(false); }
  };
  const onGenerate = async () => { await generateSalary({ period }); message.success('工资单已生成'); load(); };
  const onSettle = async () => { await settleSplits({ period }); message.success('分账已结算'); load(); };

  const splitCols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '周期', dataIndex: 'period', width: 80 },
    { title: '类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag color={SPLIT_TYPE[v]?.color}>{SPLIT_TYPE[v]?.label}</Tag> },
    { title: '教师', dataIndex: 'teacherId', width: 80 },
    { title: '课时价值', dataIndex: 'baseAmount', width: 100, render: (v: number) => `¥${v}` },
    { title: '分成率', dataIndex: 'rate', width: 80, render: (v: number) => `${(v * 100).toFixed(0)}%` },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v}` },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={SPLIT_STATUS[v]?.color}>{SPLIT_STATUS[v]?.label}</Tag> },
  ], []);
  const salaryCols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '周期', dataIndex: 'period', width: 80 },
    { title: '教师', dataIndex: 'teacherId', width: 80 },
    { title: '课次', dataIndex: 'lessonsCount', width: 70 },
    { title: '课时', dataIndex: 'hoursCount', width: 70 },
    { title: '课时费', dataIndex: 'baseAmount', width: 100, render: (v: number) => `¥${v}` },
    { title: '提成', dataIndex: 'bonus', width: 100, render: (v: number) => `¥${v}` },
    { title: '应发', dataIndex: 'total', width: 100, render: (v: number) => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string, r: any) => (
        <Space size={2}>
          <Tag color={SALARY_STATUS[v]?.color}>{SALARY_STATUS[v]?.label}</Tag>
          {v === 'DRAFT' && <Button type="link" size="small" onClick={async () => { await confirmSalary(r.id); message.success('已确认'); load(); }}>确认</Button>}
          {v === 'CONFIRMED' && <Button type="link" size="small" onClick={async () => { await paySalary(r.id); message.success('已发放'); load(); }}>发放</Button>}
        </Space>
      ),
    },
  ], []);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={load}>刷新</Button>
        <Button onClick={openCfg}>分账配置</Button>
        <Button type="primary" onClick={onGenerate}>生成工资单</Button>
        <Button onClick={onSettle}>结算分账</Button>
        <Select value={period} style={{ width: 130 }} onChange={setPeriod}
          options={[period, period.slice(0, 4) + '-01'].map((p) => ({ value: p, label: p }))} />
      </Space>
      <div>当前提成率：教师 <b>{((cfg?.teacherRate || 0) * 100).toFixed(0)}%</b> · 渠道 <b>{((cfg?.channelRate || 0) * 100).toFixed(0)}%</b> · 工资提成系数 <b>{((cfg?.bonusRate || 0) * 100).toFixed(0)}%</b></div>
      <Table rowKey="id" size="small" style={{ marginTop: 8 }} dataSource={splits} columns={splitCols}
        pagination={{ current: page, pageSize: 20, total: totalS, onChange: setPage }}  scroll={{ x: 'max-content' }} />
      <div style={{ marginTop: 16, fontWeight: 600 }}>教师工资单</div>
      <Table rowKey="id" size="small" dataSource={salary} columns={salaryCols}
        pagination={{ pageSize: 100, total: totalSa }}  scroll={{ x: 'max-content' }} />

      <Modal title="分账配置" open={cfgOpen} confirmLoading={cfgSubmitting} onOk={submitCfg} onCancel={() => setCfgOpen(false)} okText="保存" cancelText="取消">
        <Form form={cfgForm} layout="vertical">
          <Form.Item name="teacherRate" label="教师课时提成率(0~1)" rules={[{ required: true }]}>
            <InputNumber step={0.05} min={0} max={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="channelRate" label="渠道/合作方分成率(0~1)" rules={[{ required: true }]}>
            <InputNumber step={0.05} min={0} max={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="bonusRate" label="工资提成系数(0~1)" rules={[{ required: true }]}>
            <InputNumber step={0.05} min={0} max={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function InvoiceTab() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [invSubmitting, setInvSubmitting] = useState(false);

  const load = async () => {
    const r = await listInvoices({ page, size: 20 });
    setRows(r.list); setTotal(r.total);
  };
  useEffect(() => {
    load();
    listStudents({ page: 1, size: 200 }).then((r) => setStudents(r.list)).catch(() => undefined);
    /* eslint-disable-next-line */
  }, [page]);

  const submit = async () => {
    const v = await form.validateFields();
    setInvSubmitting(true);
    try { await applyInvoice(v); message.success('发票申请已提交'); setOpen(false); load(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setInvSubmitting(false); }
  };

  const studentOpts = useMemo(() => students.map((s) => ({ value: s.id, label: s.name })), [students]);
  const cols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '订单', dataIndex: 'orderId', width: 80 },
    { title: '学员', dataIndex: 'studentId', width: 90, render: (v: number) => students.find((s) => s.id === v)?.name || v },
    { title: '抬头', dataIndex: 'title', width: 140 },
    { title: '税号', dataIndex: 'taxNo', width: 120, render: (v: string) => v || '-' },
    { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', width: 160,
      render: (v: string, r: any) => (
        <Space size={2}>
          <Tag color={INVOICE_STATUS[v]?.color}>{INVOICE_STATUS[v]?.label}</Tag>
          {v === 'APPLIED' && <Button type="link" size="small" onClick={async () => { await issueInvoice(r.id); message.success('已开具'); load(); }}>开具</Button>}
        </Space>
      ),
    },
    { title: '票号', dataIndex: 'invoiceNo', width: 130, render: (v: string) => v || '-' },
  ], [students]);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={load}>刷新</Button>
        <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>申请发票</Button>
      </Space>
      <Table rowKey="id" size="small" dataSource={rows} columns={cols}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage }}  scroll={{ x: 'max-content' }} />

      <Modal title="申请电子发票" open={open} confirmLoading={invSubmitting} onOk={submit} onCancel={() => setOpen(false)} okText="提交" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="orderId" label="订单ID" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="studentId" label="学员" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={studentOpts} />
          </Form.Item>
          <Form.Item name="title" label="发票抬头" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="taxNo" label="税号"><Input /></Form.Item>
          <Form.Item name="amount" label="开票金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ReportTab() {
  const { token } = theme.useToken();
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    const d = await financeSummary({ from: from || undefined, to: to || undefined });
    setData(d);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="起始" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="截止" />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      {data && (
        <Row gutter={16}>
          <Col span={6}><Card><Statistic title="已收收入" value={data.paidIncome} precision={2} prefix="¥" /></Card></Col>
          <Col span={6}><Card><Statistic title="退费" value={data.refunded} precision={2} prefix="¥" valueStyle={{ color: token.colorError }} /></Card></Col>
          <Col span={6}><Card><Statistic title="净收入" value={data.netIncome} precision={2} prefix="¥" /></Card></Col>
          <Col span={6}><Card><Statistic title="已消课价值" value={data.consumedValue} precision={2} prefix="¥" /></Card></Col>
          <Col span={6}><Card><Statistic title="消课课时" value={data.consumptionHours} /></Card></Col>
          <Col span={6}><Card><Statistic title="分账支出" value={data.splitExpense} precision={2} prefix="¥" valueStyle={{ color: token.colorError }} /></Card></Col>
          <Col span={6}><Card><Statistic title="工资应付" value={data.salaryPayable} precision={2} prefix="¥" valueStyle={{ color: token.colorError }} /></Card></Col>
          <Col span={6}><Card><Statistic title="利润" value={data.profit} precision={2} prefix="¥" valueStyle={{ color: data.profit >= 0 ? token.colorSuccess : token.colorError }} /></Card></Col>
          <Col span={6}><Card><Statistic title="订单数" value={data.orderCount} /></Card></Col>
          <Col span={6}><Card><Statistic title="退费单数" value={data.refundsCount} /></Card></Col>
        </Row>
      )}
    </div>
  );
}

/** AI 智能对账（§9.5 资损防控）：核对订单 vs 收款 vs 退款，标记差异供财务人工挂账 */
function ReconcileTab() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await financeReconcile();
      setData(r);
      if (r.discrepancies?.length) message.warning(`发现 ${r.discrepancies.length} 项差异，请人工复核`);
      else message.success('对账一致，未发现差异');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" loading={loading} onClick={run}>执行对账</Button>
        {data && <Tag>{data.aiPowered ? 'AI 增强' : '启发式'}</Tag>}
      </Space>
      {!data && <div style={{ color: '#999' }}>点击「执行对账」核对订单流水、收款与退款，识别超收/超退等资损差异（仅辅助，需财务人工复核挂账）。</div>}
      {data && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert type={data.discrepancies?.length ? 'warning' : 'success'} message={data.aiSummary} />
          <Row gutter={16}>
            <Col span={6}><Card size="small"><Statistic title="已核对订单" value={data.checked} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="差异数" value={data.discrepancies?.length || 0} valueStyle={{ color: data.discrepancies?.length ? token.colorError : token.colorSuccess }} /></Card></Col>
          </Row>
          {data.discrepancies?.length > 0 && (
            <Table
              rowKey={(r, i) => String(i)}
              size="small"
              dataSource={data.discrepancies}
              pagination={false}
              columns={[{ title: '差异明细', dataIndex: (r: string) => r, render: (v: string) => <Tag color="red">{v}</Tag> }]}
            />
          )}
        </Space>
      )}
    </div>
  );
}
