import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  Card,
  message,
  Tag,
} from 'antd';
import {
  listMetricDefs,
  createMetricDef,
  updateMetricDef,
  removeMetricDef,
  getBenchmark,
  customReport,
  evaluateAlerts,
} from '../api/crm';

const REPORT_DIM: Record<string, string[]> = {
  order: ['status', 'month'],
  lead: ['channel', 'campaign', 'stage'],
};
const REPORT_MET: Record<string, string[]> = {
  order: ['orderCount', 'receivable', 'received', 'refundAmount', 'studentCount'],
  lead: ['leadCount', 'trial', 'signed'],
};

export default function ReportPage() {
  return (
    <div style={{ padding: 16 }}>
      <Tabs
        items={[
          { key: 'metric', label: '指标配置', children: <MetricTab /> },
          { key: 'bench', label: '多校区对标', children: <BenchmarkTab /> },
          { key: 'report', label: '自定义报表', children: <ReportTab /> },
          { key: 'alert', label: '预警评估', children: <AlertTab /> },
        ]}
      />
    </div>
  );
}

function MetricTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () =>
    listMetricDefs().then((r) => setRows(r.list || [])).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const v = await form.validateFields();
    if (editing) await updateMetricDef(editing.id, v);
    else await createMetricDef(v);
    message.success('已保存');
    setOpen(false);
    load();
  };

  const columns = [
    { title: '编码', dataIndex: 'code' },
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (c: string) => <Tag>{c}</Tag> },
    { title: '单位', dataIndex: 'unit' },
    { title: '启用', dataIndex: 'enabled', render: (e: boolean) => <Tag color={e ? 'green' : 'default'}>{e ? '是' : '否'}</Tag> },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
          <Button size="small" danger onClick={async () => { await removeMetricDef(r.id); load(); }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" style={{ marginBottom: 12 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
        新增指标
      </Button>
      <Table rowKey="id" size="small" dataSource={rows} columns={columns} />
      <Modal
        title={editing ? '编辑指标' : '新增指标'}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="编码(关联看板指标)" rules={[{ required: true }]}>
            <Input placeholder="如 TRIAL_CONVERSION" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" initialValue="common">
            <Select options={[
              { value: 'principal', label: '经营' },
              { value: 'admission', label: '招生' },
              { value: 'teaching', label: '教学' },
              { value: 'common', label: '通用' },
            ]} />
          </Form.Item>
          <Form.Item name="unit" label="单位"><Input placeholder="如 % / 元 / 人" /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function BenchmarkTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { getBenchmark().then(setData).catch(() => setData(null)); }, []);
  if (!data) return <div>加载中…</div>;
  const cols = [
    { title: '校区', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: '成本合计', dataIndex: 'costTotal' },
    { title: '物料数', dataIndex: 'materialCount' },
    { title: '库存金额', dataIndex: 'stockValue' },
  ];
  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Card size="small" title="校区数"><b>{data.campusCount}</b></Card>
        <Card size="small" title="总成本"><b>{data.totalCost}</b></Card>
        <Card size="small" title="平均成本"><b>{data.compare.avgCost}</b></Card>
        <Card size="small" title="最高成本校区"><b>{data.compare.highestCost?.name || '-'}</b></Card>
        <Card size="small" title="最低成本校区"><b>{data.compare.lowestCost?.name || '-'}</b></Card>
      </Space>
      <Table rowKey="id" size="small" dataSource={data.campuses} columns={cols} />
    </div>
  );
}

function ReportTab() {
  const [source, setSource] = useState<'order' | 'lead'>('order');
  const [dimensions, setDimensions] = useState<string[]>(['status']);
  const [metrics, setMetrics] = useState<string[]>(['orderCount']);
  const [rows, setRows] = useState<any[]>([]);

  const gen = async () => {
    if (!dimensions.length || !metrics.length) { message.warning('请选择维度与指标'); return; }
    const r = await customReport({ source, dimensions, metrics });
    setRows(r.rows || []);
  };

  const cols = [
    ...dimensions.map((d) => ({ title: d, dataIndex: d })),
    ...metrics.map((m) => ({ title: m, dataIndex: m })),
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select value={source} style={{ width: 140 }} onChange={(v) => { setSource(v); setDimensions([]); setMetrics([]); }} options={[
          { value: 'order', label: '订单' }, { value: 'lead', label: '线索' },
        ]} />
        <Select mode="multiple" placeholder="维度" style={{ minWidth: 220 }} value={dimensions}
          onChange={setDimensions} options={REPORT_DIM[source].map((d) => ({ value: d, label: d }))} />
        <Select mode="multiple" placeholder="指标" style={{ minWidth: 280 }} value={metrics}
          onChange={setMetrics} options={REPORT_MET[source].map((m) => ({ value: m, label: m }))} />
        <Button type="primary" onClick={gen}>生成报表</Button>
      </Space>
      <Table rowKey="key" size="small" dataSource={rows} columns={cols} scroll={{ x: 'max-content' }} />
    </div>
  );
}

function AlertTab() {
  const [res, setRes] = useState<any>(null);
  const run = async () => {
    const r = await evaluateAlerts();
    setRes(r);
  };
  return (
    <div>
      <Button type="primary" onClick={run}>立即评估全部规则</Button>
      {res && (
        <Card style={{ marginTop: 12 }} title={`触发 ${res.triggeredCount} 条 / 推送 ${res.notified.length} 条`}>
          <Table rowKey="id" size="small" dataSource={res.triggered} pagination={false} columns={[
            { title: '规则', dataIndex: 'name' },
            { title: '指标', dataIndex: 'metric' },
            { title: '当前值', dataIndex: 'value' },
            { title: '渠道', dataIndex: 'channel' },
          ]} />
        </Card>
      )}
    </div>
  );
}
