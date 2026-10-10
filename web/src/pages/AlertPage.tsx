import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag, Popconfirm, Card } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listAlertRules, createAlertRule, deleteAlertRule, checkAlert } from '../api/crm';

export default function AlertPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [checkResult, setCheckResult] = useState<any>(null);

  const load = async () => { const r = await listAlertRules({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 })); setRows(r.list); setTotal(r.total); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cols = [
    { title: '名称', dataIndex: 'name' },
    { title: '指标', dataIndex: 'metric' },
    { title: '条件', render: (_: any, r: any) => `${r.operator} ${r.threshold}` },
    { title: '渠道', dataIndex: 'channel', render: (v: string) => <Tag>{v}</Tag> },
    { title: '启用', dataIndex: 'enabled', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag> },
    { title: '操作', width: 100, render: (_: any, r: any) => (
      <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteAlertRule(r.id); message.success('已删除'); load(); }}>
        <Button type="link" danger size="small">删除</Button>
      </Popconfirm>
    ) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ operator: 'GT', channel: 'INAPP', enabled: true }); setOpen(true); }}>新建规则</Button>
        <Button onClick={async () => { setCheckResult(await checkAlert({ ARREARS_AMOUNT: 5000, ATTENDANCE_RATE: 0.6, TRIAL_CONVERSION: 0.2 })); }}>模拟检查(示例指标)</Button>
      </Space>
      <Table rowKey="id" size="small" dataSource={rows} columns={cols} pagination={{ total }} />
      {checkResult && (
        <Card size="small" title="触发结果" style={{ marginTop: 12 }}>
          {checkResult.triggered.length ? checkResult.triggered.map((t: any) => <div key={t.rule.id}>规则「{t.rule.name}」触发，当前值={t.value}</div>) : <div>无触发</div>}
        </Card>
      )}
      <Modal title="新建预警规则" open={open} onOk={async () => { const v = await form.validateFields(); await createAlertRule(v); message.success('创建成功'); setOpen(false); load(); }} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="metric" label="指标" rules={[{ required: true, message: '必填' }]}><Input placeholder="ARREARS_AMOUNT / ATTENDANCE_RATE / TRIAL_CONVERSION" /></Form.Item>
          <Form.Item name="operator" label="比较" rules={[{ required: true }]}><Select options={[{ value: 'GT', label: '>' }, { value: 'LT', label: '<' }, { value: 'GTE', label: '>=' }, { value: 'LTE', label: '<=' }]} /></Form.Item>
          <Form.Item name="threshold" label="阈值" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="channel" label="渠道"><Select options={[{ value: 'INAPP', label: '站内' }, { value: 'SMS', label: '短信' }, { value: 'WECHAT', label: '微信' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
