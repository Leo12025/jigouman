import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Card } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listAlertRules, createAlertRule, deleteAlertRule, checkAlert } from '../api/crm';
import { useCrud } from '../hooks/useCrud';

export default function AlertPage() {
  const { rows, total, loading, submitting, load, save, del } = useCrud({
    list: listAlertRules,
    create: createAlertRule,
    remove: deleteAlertRule,
    size: 50,
  });
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openCreate = () => {
    setOpen(true);
    form.resetFields();
    form.setFieldsValue({ operator: 'GT', channel: 'INAPP', enabled: true });
  };
  const submit = async () => {
    const v = await form.validateFields();
    const ok = await save(null, v);
    if (ok) setOpen(false);
  };

  const columns = useMemo(() => [
    { title: '名称', dataIndex: 'name' },
    { title: '指标', dataIndex: 'metric' },
    { title: '条件', render: (_: any, r: any) => `${r.operator} ${r.threshold}` },
    { title: '渠道', dataIndex: 'channel', render: (v: string) => <Tag>{v}</Tag> },
    { title: '启用', dataIndex: 'enabled', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '是' : '否'}</Tag> },
    {
      title: '操作', width: 100, render: (_: any, r: any) => (
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ], []);

  return (
    <PageContainer title="预警管理">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建规则</Button>
        <Button onClick={async () => { setCheckResult(await checkAlert({ ARREARS_AMOUNT: 5000, ATTENDANCE_RATE: 0.6, TRIAL_CONVERSION: 0.2 })); }}>模拟检查(示例指标)</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} dataSource={rows} columns={columns} pagination={{ total }} />
      {checkResult && (
        <Card size="small" title="触发结果" style={{ marginTop: 12 }}>
          {checkResult.triggered.length ? checkResult.triggered.map((t: any) => <div key={t.rule.id}>规则「{t.rule.name}」触发，当前值={t.value}</div>) : <div>无触发</div>}
        </Card>
      )}
      <Modal title="新建预警规则" open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="metric" label="指标" rules={[{ required: true, message: '必填' }]}><Input placeholder="ARREARS_AMOUNT / ATTENDANCE_RATE / TRIAL_CONVERSION" /></Form.Item>
          <Form.Item name="operator" label="比较" rules={[{ required: true }]}><Select options={[{ value: 'GT', label: '>' }, { value: 'LT', label: '<' }, { value: 'GTE', label: '>=' }, { value: 'LTE', label: '<=' }]} /></Form.Item>
          <Form.Item name="threshold" label="阈值" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="channel" label="渠道"><Select options={[{ value: 'INAPP', label: '站内' }, { value: 'SMS', label: '短信' }, { value: 'WECHAT', label: '微信' }]} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
