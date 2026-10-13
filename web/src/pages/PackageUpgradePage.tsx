import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, InputNumber, Select, Space, Tag, Descriptions, App, Input,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  listUpgrades, previewUpgrade, createUpgrade, listCoursePackages,
} from '../api/crm';
import { withComplianceConfirm } from '../api/client';

const STATUS_TAG: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待审批' },
  APPROVED: { color: 'cyan', text: '已批准待补款' },
  REJECTED: { color: 'red', text: '已驳回' },
  DONE: { color: 'green', text: '已执行' },
  CANCELLED: { color: 'default', text: '已撤销' },
};

export default function PackageUpgradePage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pkgOptions, setPkgOptions] = useState<{ value: number; label: string }[]>([]);

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listUpgrades({ page, size: 20 });
      setData(r.list || []);
      setTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    listCoursePackages({ page: 1, size: 200, status: 1 })
      .then((r: any) => {
        const list = (r.list || []).filter((p: any) => p.consumeMode === 'BY_HOUR');
        setPkgOptions(list.map((p: any) => ({ value: p.id, label: p.name })));
      })
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ includeGift: false });
    setQuote(null);
    setOpen(true);
  };

  const onQuote = async () => {
    const v = await form.validateFields(['studentId', 'fromAccountId', 'toPackageId']);
    setQuoting(true);
    try {
      const r = await previewUpgrade({
        studentId: v.studentId,
        fromAccountId: v.fromAccountId,
        toPackageId: v.toPackageId,
        toTierId: v.toTierId,
        includeGift: v.includeGift,
      });
      setQuote(r);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setQuoting(false); }
  };

  const onSubmit = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      await withComplianceConfirm((extra) => createUpgrade({ ...v, ...extra }));
      message.success('升级单已创建，已发起审批');
      setOpen(false);
      load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setSubmitting(false); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '学员ID', dataIndex: 'studentId', width: 100 },
    { title: '原账户', dataIndex: 'fromAccountId', width: 100 },
    { title: '目标套餐', dataIndex: 'toPackageId', width: 100 },
    { title: '折价课时', dataIndex: 'carryHours', width: 100 },
    {
      title: '赠课折价', dataIndex: 'includeGift', width: 100,
      render: (b: boolean, r: any) => (b ? <Tag color="gold">含 {r.giftHours} 课时</Tag> : <span>否</span>),
    },
    { title: '折价金额', dataIndex: 'deductAmount', width: 110, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    {
      title: '应付差价', dataIndex: 'payableAmount', width: 120,
      render: (v: number) => <b style={{ color: '#cf1322' }}>¥{Number(v || 0).toFixed(2)}</b>,
    },
    {
      title: '状态', dataIndex: 'status', width: 120,
      render: (s: string) => <Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.text || s}</Tag>,
    },
    { title: '执行时间', dataIndex: 'executedAt', width: 170, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <PageContainer title="套餐升级补差价">
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={openCreate}>新建升级单</Button>
        <span style={{ color: '#888' }}>
          口径：原剩余付费课时 × 原单价 折价抵扣新套餐价款；折价后原账户清零，补款付清且审批通过后发放新课时
        </span>
      </Space>

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        size="small" scroll={{ x: 'max-content' }}
      />

      <Modal
        title="新建套餐升级单" open={open} confirmLoading={submitting}
        onOk={onSubmit} onCancel={() => setOpen(false)} okText="提交审批" width={620}
      >
        <Form form={form} layout="vertical">
          <Space size="large" wrap>
            <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '请输入学员ID' }]}>
              <InputNumber min={1} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="fromAccountId" label="原课时账户ID" rules={[{ required: true, message: '请输入原账户ID' }]}
              tooltip="在「课时管理」中查询该学员的课时账户 ID"
            >
              <InputNumber min={1} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="toPackageId" label="目标套餐" rules={[{ required: true, message: '请选择目标套餐' }]}>
              <Select style={{ width: 240 }} options={pkgOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="includeGift" label="赠课是否参与折价" tooltip="默认不参与，与退费口径一致（赠课不退不折现）">
              <Select
                style={{ width: 160 }}
                options={[{ value: false, label: '不参与' }, { value: true, label: '参与折价' }]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="remark" label="备注">
            <Input />
          </Form.Item>

          <Space>
            <Button onClick={onQuote} loading={quoting}>试算差价</Button>
            {quote && (
              <Descriptions size="small" column={2} bordered style={{ flex: 1 }}>
                <Descriptions.Item label="折价课时">{quote.carryHours}</Descriptions.Item>
                <Descriptions.Item label="赠课折价课时">{quote.giftHours}</Descriptions.Item>
                <Descriptions.Item label="原账户单价">¥{Number(quote.unitValue || 0).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="折价金额">¥{Number(quote.deductAmount || 0).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="目标套餐价">¥{Number(quote.targetAmount || 0).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="应付差价">
                  <b style={{ color: '#cf1322' }}>¥{Number(quote.payableAmount || 0).toFixed(2)}</b>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
