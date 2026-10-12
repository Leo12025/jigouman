import { useEffect, useState, useMemo } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, Switch, InputNumber, Space, Card, Tag, App } from 'antd';
import PageContainer from '../components/PageContainer';
import {
  listMetricDefs, createMetricDef, updateMetricDef, removeMetricDef,
  getBenchmark, customReport, evaluateAlerts, exportReportFile, exportBenchmarkFile,
} from '../api/crm';

const REPORT_DIM: Record<string, string[]> = { order: ['status', 'month'], lead: ['channel', 'campaign', 'stage'] };
const REPORT_MET: Record<string, string[]> = {
  order: ['orderCount', 'receivable', 'received', 'refundAmount', 'studentCount'],
  lead: ['leadCount', 'trial', 'signed'],
};

export default function ReportPage() {
  return (
    <PageContainer title="看板配置/报表">
      <Tabs items={[
        { key: 'metric', label: '指标配置', children: <MetricTab /> },
        { key: 'bench', label: '多校区对标', children: <BenchmarkTab /> },
        { key: 'report', label: '自定义报表', children: <ReportTab /> },
        { key: 'alert', label: '预警评估', children: <AlertTab /> },
      ]} />
    </PageContainer>
  );
}

function MetricTab() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = () => listMetricDefs().then((r) => setRows(r.list || [])).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) await updateMetricDef(editing.id, v); else await createMetricDef(v);
      message.success('已保存'); setOpen(false); load();
    } catch { /* 统一提示 */ } finally { setSubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: '编码', dataIndex: 'code' },
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (c: string) => <Tag>{c}</Tag> },
    { title: '单位', dataIndex: 'unit' },
    { title: '启用', dataIndex: 'enabled', render: (e: boolean) => <Tag color={e ? 'green' : 'default'}>{e ? '是' : '否'}</Tag> },
    { title: '操作', render: (_: any, r: any) => (
      <Space>
        <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
        <Button size="small" danger onClick={async () => { await removeMetricDef(r.id); load(); }}>删除</Button>
      </Space>
    ) },
  ], []);

  return (
    <Card size="small">
      <Button type="primary" style={{ marginBottom: 12 }} onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ enabled: true }); setOpen(true); }}>新建指标</Button>
      <Table rowKey="id" size="small" dataSource={rows} columns={columns} pagination={false} />
      <Modal title={editing ? '编辑指标' : '新建指标'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}><Input placeholder="revenue_month" /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}><Input placeholder="finance" /></Form.Item>
          <Form.Item name="unit" label="单位"><Input placeholder="元/人" /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function BenchmarkTab() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const load = () => getBenchmark().then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  const doExport = async () => {
    setExporting(true);
    try { await exportBenchmarkFile('excel'); message.success('已导出 Excel'); }
    catch { /* 拦截器统一提示 */ } finally { setExporting(false); }
  };

  const cols = useMemo(() => [
    { title: '校区', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: '成本合计', dataIndex: 'costTotal' },
    { title: '物料数', dataIndex: 'materialCount' },
    { title: '库存金额', dataIndex: 'stockValue' },
  ], []);

  if (!data) return <Card size="small" loading>加载中…</Card>;
  return (
    <Card size="small" title="多校区成本对标" extra={<Button loading={exporting} onClick={doExport}>导出Excel</Button>}>
      <Table rowKey="name" size="small" dataSource={data.campuses || []} columns={cols} pagination={false} />
    </Card>
  );
}

function ReportTab() {
  const { message } = App.useApp();
  const [source, setSource] = useState<'order' | 'lead'>('order');
  const [dimensions, setDimensions] = useState<string[]>(['status']);
  const [metrics, setMetrics] = useState<string[]>(['orderCount']);
  const [rows, setRows] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const gen = async () => {
    if (!dimensions.length || !metrics.length) { message.warning('请选择维度与指标'); return; }
    const r = await customReport({ source, dimensions, metrics });
    setRows(r.rows || []);
  };
  const doExport = async (format: 'excel' | 'pdf') => {
    if (!dimensions.length || !metrics.length) { message.warning('请选择维度与指标'); return; }
    setExporting(true);
    try {
      await exportReportFile({ source, dimensions, metrics, format, title: `自定义报表_${source}` });
      message.success(`已导出 ${format.toUpperCase()}`);
    } catch { /* 错误提示已由拦截器统一处理 */ } finally { setExporting(false); }
  };

  const cols = useMemo(() => [
    ...dimensions.map((d) => ({ title: d, dataIndex: d })),
    ...metrics.map((m) => ({ title: m, dataIndex: m })),
  ], [dimensions, metrics]);

  return (
    <Card size="small">
      <Space wrap style={{ marginBottom: 12 }}>
        <Select value={source} style={{ width: 120 }} onChange={(v) => { setSource(v); setDimensions([]); setMetrics([]); }} options={[{ value: 'order', label: '订单' }, { value: 'lead', label: '招生' }]} />
        <Select mode="multiple" placeholder="维度" style={{ minWidth: 200 }} value={dimensions} onChange={setDimensions} options={REPORT_DIM[source].map((d) => ({ value: d, label: d }))} />
        <Select mode="multiple" placeholder="指标" style={{ minWidth: 220 }} value={metrics} onChange={setMetrics} options={REPORT_MET[source].map((m) => ({ value: m, label: m }))} />
        <Button type="primary" onClick={gen}>生成</Button>
        <Button loading={exporting} onClick={() => doExport('excel')}>导出Excel</Button>
        <Button loading={exporting} onClick={() => doExport('pdf')}>导出PDF</Button>
      </Space>
      <Table rowKey="__idx" size="small" dataSource={rows} columns={cols} pagination={false} />
    </Card>
  );
}

function AlertTab() {
  const [res, setRes] = useState<any>(null);
  const run = async () => { const r = await evaluateAlerts(); setRes(r); };
  return (
    <Card size="small" title="预警评估" extra={<Button onClick={run}>运行评估</Button>}>
      {res ? (
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(res, null, 2)}</pre>
      ) : <div>点击「运行评估」计算各校区预警指标。</div>}
    </Card>
  );
}
