import { theme } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Drawer, Descriptions, Tabs, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import {
  listOrders, getOrder, createOrder, payOrder, refundOrder,
  listStudents, listCourses, listUsers, previewRefund,
} from '../api/crm';

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待支付', color: 'default' },
  PAID: { label: '已支付', color: 'green' },
  COMPLETED: { label: '已完成', color: 'blue' },
  CANCELLED: { label: '已取消', color: 'red' },
  REFUNDING: { label: '退款中', color: 'orange' },
  REFUNDED: { label: '已退费', color: 'volcano' },
};

export default function OrderPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [keyword, setKeyword] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundPreview, setRefundPreview] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  const studentName = (id?: number) => students.find((s) => s.id === id)?.name || id;
  const courseName = (id?: number) => courses.find((c) => c.id === id)?.name || id;

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listOrders({ page: p, size: s, keyword, status });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listStudents({ page: 1, size: 200 }).then((r) => setStudents(r.list)).catch(() => undefined);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    listUsers({ page: 1, size: 200 }).then((r) => setUsers(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ items: [{ qty: 1, unitPrice: 0, hours: 0 }], discountAmount: 0 });
    setOpen(true);
  };

  const payable = Form.useWatch('items', form) || [];
  const discount = Form.useWatch('discountAmount', form) || 0;
  const computedPayable = payable.reduce(
    (sum: number, it: any) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0),
    0,
  ) - (Number(discount) || 0);

  const submit = async () => {
    const v = await form.validateFields();
    setCreateSubmitting(true);
    try {
      await createOrder(v);
      message.success('订单已创建');
      setOpen(false); load();
    } finally { setCreateSubmitting(false); }
  };

  const openPay = (r: any) => { payForm.setFieldsValue({ channel: 'OFFLINE', amount: r.payableAmount }); setDetailId(r.id); setPayOpen(true); };
  const submitPay = async () => {
    const v = await payForm.validateFields();
    setPaySubmitting(true);
    try {
      await payOrder(detailId!, v);
      message.success('支付成功，课时已发放');
      setPayOpen(false); load();
      if (detail) openDetail(detailId!);
    } finally { setPaySubmitting(false); }
  };

  const openRefund = async (r: any) => {
    setDetailId(r.id);
    try {
      const pv = await previewRefund(r.id);
      setRefundPreview(pv);
      refundForm.setFieldsValue({ amount: pv.refundable });
    } catch { setRefundPreview(null); }
    setRefundOpen(true);
  };
  const submitRefund = async () => {
    const v = await refundForm.validateFields();
    setRefundSubmitting(true);
    try {
      await refundOrder(detailId!, v);
      message.success('退费申请已提交，待审批');
      setRefundOpen(false); load();
      if (detail) openDetail(detailId!);
    } finally { setRefundSubmitting(false); }
  };

  const openDetail = async (id: number) => {
    setDetail(await getOrder(id));
    setDetailId(id);
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '订单号', dataIndex: 'orderNo', width: 160 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '应收', dataIndex: 'totalAmount', width: 90, render: (v: number) => `¥${v}` },
    { title: '优惠', dataIndex: 'discountAmount', width: 80, render: (v: number) => `¥${v}` },
    { title: '应付', dataIndex: 'payableAmount', width: 90, render: (v: number) => `¥${v}` },
    { title: '已收', dataIndex: 'paidAmount', width: 90, render: (v: number) => `¥${v}` },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label}</Tag> },
    {
      title: '操作', width: 220, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { openDetail(r.id); }}>详情</Button>
          {r.status === 'PENDING' && <Button type="link" size="small" onClick={() => openPay(r)}>支付</Button>}
          {(r.status === 'PAID' || r.status === 'COMPLETED') && (
            <Button type="link" size="small" danger onClick={() => openRefund(r)}>退费</Button>
          )}
        </Space>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], [students, courses]);

  return (
    <PageContainer title="订单管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="订单号" allowClear style={{ width: 180 }} onChange={(e) => setKeyword(e.target.value || undefined)} onPressEnter={() => load(1, size)} />
        <Select placeholder="状态" allowClear style={{ width: 120 }} options={Object.entries(STATUS).map(([v, o]) => ({ value: v, label: o.label }))} onChange={(v) => setStatus(v)} />
        <Button type="primary" onClick={() => load(1, size)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(undefined); setStatus(undefined); load(1, size); }}>重置</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建订单</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      {/* 下单 */}
      <Modal title="新建订单" open={open} width={720} confirmLoading={createSubmitting} onOk={submit} onCancel={() => setOpen(false)} okText="创建" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
            <Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" wrap style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...f} name={[f.name, 'courseId']} rules={[{ required: true, message: '课程' }]} style={{ marginBottom: 0 }}>
                      <Select showSearch optionFilterProp="label" placeholder="课程" style={{ width: 180 }}
                        options={courses.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(cid) => form.setFieldValue(['items', f.name, 'name'], courseName(cid))} />
                    </Form.Item>
                    <Form.Item {...f} name={[f.name, 'qty']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={1} placeholder="数量" />
                    </Form.Item>
                    <Form.Item {...f} name={[f.name, 'unitPrice']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} placeholder="单价" />
                    </Form.Item>
                    <Form.Item {...f} name={[f.name, 'hours']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} placeholder="发放课时" />
                    </Form.Item>
                    <Popconfirm title="删除该项?" onConfirm={() => remove(f.name)}>
                      <Button danger size="small">删</Button>
                    </Popconfirm>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ qty: 1, unitPrice: 0, hours: 0 })} block>添加订单项</Button>
              </>
            )}
          </Form.List>
          <Form.Item name="discountAmount" label="优惠金额" style={{ marginTop: 8 }}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <div>应付合计：<b>¥{Math.max(0, computedPayable).toFixed(2)}</b></div>
        </Form>
      </Modal>

      {/* 支付 */}
      <Modal title="订单支付" open={payOpen} confirmLoading={paySubmitting} onOk={submitPay} onCancel={() => setPayOpen(false)} okText="确认支付" cancelText="取消">
        <Form form={payForm} layout="vertical">
          <Form.Item name="channel" label="支付渠道" rules={[{ required: true }]}>
            <Select options={[{ value: 'WECHAT', label: '微信' }, { value: 'ALIPAY', label: '支付宝' }, { value: 'OFFLINE', label: '线下' }, { value: 'CARD', label: '刷卡' }]} />
          </Form.Item>
          <Form.Item name="amount" label="支付金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="tradeNo" label="第三方交易号"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 退费 */}
      <Modal title="申请退费" open={refundOpen} confirmLoading={refundSubmitting} onOk={submitRefund} onCancel={() => setRefundOpen(false)} okText="提交" cancelText="取消">
        {refundPreview && (
          <div style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 6, fontSize: 13 }}>
            <div>已付：¥{refundPreview.paidAmount} · 总课时：{refundPreview.totalHours} · 剩余：{refundPreview.remainingHours} · 已消：{refundPreview.consumedHours}</div>
            <div style={{ marginTop: 4 }}>按消课比例可退：<b>¥{refundPreview.refundable}</b>（已消课价值不退款）</div>
          </div>
        )}
        <Form form={refundForm} layout="vertical">
          <Form.Item name="amount" label="退费金额" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="退费原因"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="approverId" label="审批人(兜底)" tooltip="已配置审批流模板时优先走模板，此处仅在未配置模板时作为单节点审批人兜底"
            rules={[{ required: true, message: '请选择兜底审批人' }]}>
            <Select showSearch optionFilterProp="label" placeholder="提交后进入审批中心"
              options={users.map((u) => ({ value: u.id, label: u.name || u.username }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 */}
      <Drawer title="订单详情" open={!!detail} onClose={() => setDetail(null)} width={760}>
        {detail && (
          <Tabs
            items={[
              {
                key: 'info', label: '订单', children: (
                  <>
                    <Descriptions column={2} bordered size="small" style={{ marginBottom: 12 }}>
                      <Descriptions.Item label="订单号">{detail.orderNo}</Descriptions.Item>
                      <Descriptions.Item label="学员">{studentName(detail.studentId)}</Descriptions.Item>
                      <Descriptions.Item label="状态"><Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label}</Tag></Descriptions.Item>
                      <Descriptions.Item label="应付">¥{detail.payableAmount}</Descriptions.Item>
                      <Descriptions.Item label="已收">¥{detail.paidAmount}</Descriptions.Item>
                      <Descriptions.Item label="优惠">¥{detail.discountAmount}</Descriptions.Item>
                    </Descriptions>
                    <Table rowKey="id" size="small" pagination={false} dataSource={detail.items || []}
                      columns={[
                        { title: '课程', dataIndex: 'courseId', render: (v: number) => courseName(v) },
                        { title: '数量', dataIndex: 'qty' },
                        { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${v}` },
                        { title: '小计', dataIndex: 'amount', render: (v: number) => `¥${v}` },
                        { title: '发放课时', dataIndex: 'hours' },
                      ]} />
                  </>
                ),
              },
              {
                key: 'pay', label: `支付(${(detail.payments || []).length})`, children: (
                  <Table rowKey="id" size="small" pagination={false} dataSource={detail.payments || []}
                    columns={[
                      { title: '渠道', dataIndex: 'channel' },
                      { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v}` },
                      { title: '状态', dataIndex: 'status' },
                      { title: '交易号', dataIndex: 'tradeNo', render: (v: string) => v || '-' },
                    ]} />
                ),
              },
              {
                key: 'refund', label: `退费(${(detail.refunds || []).length})`, children: (
                  <>
                    <Table rowKey="id" size="small" pagination={false} dataSource={detail.refunds || []}
                      columns={[
                        { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${v}` },
                        { title: '状态', dataIndex: 'status' },
                        { title: '原因', dataIndex: 'reason', render: (v: string) => v || '-' },
                        { title: '审批实例', dataIndex: 'approvalInstanceId', render: (v: number) => v ? `#${v}` : '-' },
                      ]} />
                    {detail.refunds?.some((r: any) => r.status === 'PENDING') && (
                      <div style={{ marginTop: 12, color: 'token.colorTextSecondary', fontSize: 13 }}>
                        该退费单待审批，请到「审批中心」处理。
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
}
