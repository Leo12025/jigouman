import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Tabs, App, Descriptions, Popconfirm,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import {
  listHourAccounts, listHourConsumptions, grantHours, listStudents, listCourses,
  freezeHourAccount, unfreezeHourAccount, closeHourAccount, extendHourAccount,
  confirmConsumption, listExpiringAccounts, lateJoinPreview, createEnrollment,
  listEnrollments, listEntitlements,
} from '../api/crm';
import { formatDateTime } from '../utils/format';

const ACCT_TYPE: Record<string, string> = { ONE_ON_ONE: '一对一', CLASS: '班课', GENERAL: '通用储值' };
const ACC_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '正常', color: 'green' },
  FROZEN: { label: '停课', color: 'orange' },
  EXPIRED: { label: '已过期', color: 'default' },
  CLOSED: { label: '已结课', color: 'red' },
};
const CONSUME_TYPE: Record<string, { label: string; color: string }> = {
  GRANT: { label: '发放', color: 'green' },
  CONSUME: { label: '消课', color: 'red' },
  ROLLBACK: { label: '回滚', color: 'orange' },
  FREEZE: { label: '冻结', color: 'gray' },
  EXPIRE: { label: '过期', color: 'gray' },
};
const CONFIRM_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待家长确认', color: 'orange' },
  CONFIRMED: { label: '已确认', color: 'green' },
  REJECTED: { label: '有异议', color: 'red' },
};
const LOW_BALANCE = 2;

export default function HourPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [totalAcc, setTotalAcc] = useState(0);
  const [totalCon, setTotalCon] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [form] = Form.useForm();

  const [extendOpen, setExtendOpen] = useState(false);
  const [extendForm] = Form.useForm();
  const [extendId, setExtendId] = useState<number>();

  const [lateOpen, setLateOpen] = useState(false);
  const [lateForm] = Form.useForm();
  const [lateQuote, setLateQuote] = useState<any>(null);
  const [lateSubmitting, setLateSubmitting] = useState(false);

  const studentName = (id?: number) => students.find((s) => s.id === id)?.name || id;
  const courseName = (id?: number) => (id ? courses.find((c) => c.id === id)?.name || id : '通用');

  const load = async () => {
    setLoading(true);
    try {
      const acc = await listHourAccounts({ page: 1, size: 100 });
      setAccounts(acc.list); setTotalAcc(acc.total);
      const con = await listHourConsumptions({ page: 1, size: 100 });
      setConsumptions(con.list); setTotalCon(con.total);
      setEnrollments((await listEnrollments().catch(() => [])) || []);
      setEntitlements((await listEntitlements().catch(() => [])) || []);
      setExpiring((await listExpiringAccounts(7).catch(() => [])) || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    listStudents({ page: 1, size: 200 }).then((r) => setStudents(r.list)).catch(() => undefined);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submitGrant = async () => {
    const v = await form.validateFields();
    setGrantSubmitting(true);
    try {
      await grantHours(v);
      message.success('已发放课时');
      setOpen(false); load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setGrantSubmitting(false); }
  };

  // ---------- 账户生命周期：停课 / 复课 / 结课 / 延期 ----------
  const onFreeze = async (id: number) => {
    await freezeHourAccount(id).catch(() => undefined);
    message.success('已停课（保留剩余课时）'); load();
  };
  const onUnfreeze = async (id: number) => {
    await unfreezeHourAccount(id).catch(() => undefined);
    message.success('已复课'); load();
  };
  const onClose = async (id: number) => {
    await closeHourAccount(id).catch(() => undefined);
    message.success('已结课（剩余课时清零，学费转手续费）'); load();
  };
  const openExtend = (id: number) => {
    setExtendId(id); extendForm.resetFields(); extendForm.setFieldsValue({ days: 30 }); setExtendOpen(true);
  };
  const submitExtend = async () => {
    const v = await extendForm.validateFields();
    await extendHourAccount(extendId!, v.days).catch(() => undefined);
    message.success('已延期'); setExtendOpen(false); load();
  };

  // ---------- 一课一消：家长确认 ----------
  const onConfirm = async (id: number, status: string) => {
    await confirmConsumption(id, status).catch(() => undefined);
    message.success(status === 'CONFIRMED' ? '已确认消课' : '已标记异议'); load();
  };

  // ---------- 插班折减（§2.3 #12） ----------
  const openLate = () => {
    lateForm.resetFields();
    lateForm.setFieldsValue({ totalLessons: 16, finishedLessons: 0, tuition: 0 });
    setLateQuote(null); setLateOpen(true);
  };
  const onLateQuote = async () => {
    const v = await lateForm.validateFields(['totalLessons', 'finishedLessons', 'tuition']);
    const q = await lateJoinPreview(v).catch(() => null);
    setLateQuote(q);
  };
  const submitLate = async () => {
    const v = await lateForm.validateFields();
    setLateSubmitting(true);
    try {
      await createEnrollment({
        studentId: v.studentId,
        classGroupId: v.classGroupId,
        courseId: v.courseId,
        joinType: 'LATE',
        totalLessons: v.totalLessons,
        finishedLessons: v.finishedLessons,
        tuition: v.tuition,
      });
      message.success('插班报名成功，已按剩余课次折减学费');
      setLateOpen(false); load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setLateSubmitting(false); }
  };

  const accColumns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag>{ACCT_TYPE[v]}</Tag> },
    {
      title: '可用课时', dataIndex: 'balance', width: 100,
      render: (v: number) => (v <= LOW_BALANCE ? <Tag color="warning"><WarningOutlined /> {v}</Tag> : v),
    },
    {
      title: '赠课', dataIndex: 'isGranted', width: 70,
      render: (b: boolean) => (b ? <Tag color="gold">赠课</Tag> : '-'),
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={ACC_STATUS[s]?.color}>{ACC_STATUS[s]?.label || s}</Tag>,
    },
    {
      title: '有效期', dataIndex: 'expireAt', width: 170,
      render: (v: string) => (v ? formatDateTime(v) : '-'),
    },
    { title: '累计发放', dataIndex: 'totalGranted', width: 90 },
    {
      title: '操作', width: 220,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          {r.status === 'ACTIVE' && <Button type="link" size="small" onClick={() => onFreeze(r.id)}>停课</Button>}
          {r.status === 'FROZEN' && <Button type="link" size="small" onClick={() => onUnfreeze(r.id)}>复课</Button>}
          <Button type="link" size="small" onClick={() => openExtend(r.id)}>延期</Button>
          {(r.status === 'ACTIVE' || r.status === 'FROZEN') && (
            <Popconfirm title="结课将清空剩余课时且不可恢复，确认？" onConfirm={() => onClose(r.id)}>
              <Button type="link" size="small" danger>结课</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], [students, courses]);

  const conColumns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    {
      title: '类型', dataIndex: 'type', width: 90,
      render: (v: string) => <Tag color={CONSUME_TYPE[v]?.color}>{CONSUME_TYPE[v]?.label}</Tag>,
    },
    { title: '课时', dataIndex: 'hours', width: 80, render: (v: number) => (v > 0 ? `+${v}` : v) },
    {
      title: '家长确认', dataIndex: 'confirmStatus', width: 120,
      render: (v: string) => (v ? <Tag color={CONFIRM_STATUS[v]?.color}>{CONFIRM_STATUS[v]?.label}</Tag> : '-'),
    },
    {
      title: '操作', width: 150,
      render: (_: any, r: any) => (r.type === 'CONSUME' && r.confirmStatus === 'PENDING' ? (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => onConfirm(r.id, 'CONFIRMED')}>确认</Button>
          <Button type="link" size="small" danger onClick={() => onConfirm(r.id, 'REJECTED')}>异议</Button>
        </Space>
      ) : '-'),
    },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => formatDateTime(v) },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], [students, courses]);

  const entColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    { title: '生效', dataIndex: 'startAt', width: 170, render: (v: string) => formatDateTime(v) },
    { title: '到期', dataIndex: 'expireAt', width: 170, render: (v: string) => formatDateTime(v) },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s}</Tag>,
    },
  ];

  const enrollColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    { title: '班期', dataIndex: 'classGroupId', width: 90 },
    {
      title: '加入方式', dataIndex: 'joinType', width: 100,
      render: (v: string) => (v === 'LATE' ? <Tag color="gold">插班</Tag> : <Tag>全程</Tag>),
    },
    { title: '可上课次', dataIndex: 'totalLessons', width: 100 },
    { title: '已出勤', dataIndex: 'attendedLessons', width: 90 },
    { title: '折减课时', dataIndex: 'discountHours', width: 100 },
    {
      title: '折减金额', dataIndex: 'discountAmount', width: 110,
      render: (v: number) => (Number(v) ? `¥${Number(v).toFixed(2)}` : '-'),
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'default'}>{s}</Tag>,
    },
  ];

  return (
    <PageContainer title="课时管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          form.resetFields(); form.setFieldsValue({ type: 'CLASS', hours: 1, grantType: 'PAID' }); setOpen(true);
        }}>手动发放课时</Button>
        <Button onClick={openLate}>插班折减报名</Button>
        {accounts.some((a) => a.balance <= LOW_BALANCE) && (
          <Tag color="warning"><WarningOutlined /> {accounts.filter((a) => a.balance <= LOW_BALANCE).length} 个低课时账户，建议续费</Tag>
        )}
        {expiring.length > 0 && (
          <Tag color="orange"><WarningOutlined /> {expiring.length} 个账户 7 天内到期</Tag>
        )}
      </Space>
      <Tabs
        items={[
          {
            key: 'accounts', label: `课时账户(${totalAcc})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={accColumns} dataSource={accounts} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
            ),
          },
          {
            key: 'consumptions', label: `课时流水(${totalCon})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={conColumns} dataSource={consumptions} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
            ),
          },
          {
            key: 'enrollments', label: `期课报名(${enrollments.length})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={enrollColumns} dataSource={enrollments} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
            ),
          },
          {
            key: 'entitlements', label: `时间权益(${entitlements.length})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={entColumns} dataSource={entitlements} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
            ),
          },
        ]}
      />

      {/* 手动发放 */}
      <Modal title="手动发放课时" open={open} confirmLoading={grantSubmitting} onOk={submitGrant} onCancel={() => setOpen(false)} okText="发放" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
            <Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="courseId" label="课程(留空=通用储值)">
            <Select allowClear options={courses.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(cid) => form.setFieldsValue({ type: cid ? 'CLASS' : 'GENERAL' })} />
          </Form.Item>
          <Form.Item name="type" label="账户类型"><Select options={Object.entries(ACCT_TYPE).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item>
          <Form.Item name="grantType" label="发放性质" tooltip="赠课独立成户：优先消耗，退费时不计入可退金额">
            <Select options={[{ value: 'PAID', label: '付费' }, { value: 'GIFT', label: '赠课' }]} />
          </Form.Item>
          <Form.Item name="hours" label="发放课时" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="validDays" label="有效期(天)" tooltip="不填=长期有效；到期由定时任务清零">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 延期 */}
      <Modal title={`账户 #${extendId} 延期`} open={extendOpen} onOk={submitExtend} onCancel={() => setExtendOpen(false)} okText="确认延期">
        <Form form={extendForm} layout="vertical">
          <Form.Item name="days" label="延期天数" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 插班折减 */}
      <Modal title="插班折减报名" open={lateOpen} width={620} confirmLoading={lateSubmitting}
        onOk={submitLate} onCancel={() => setLateOpen(false)} okText="确认报名" cancelText="取消">
        <Form form={lateForm} layout="vertical">
          <Space size="large" wrap>
            <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
              <Select showSearch optionFilterProp="label" style={{ width: 200 }}
                options={students.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="courseId" label="课程">
              <Select allowClear style={{ width: 180 }} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="classGroupId" label="班期ID">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="totalLessons" label="班期总课次" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="finishedLessons" label="已上课次" tooltip="插班时班期已上过的课次" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="tuition" label="全程学费" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 160 }} addonBefore="¥" />
            </Form.Item>
          </Space>
          <Space align="start" wrap>
            <Button onClick={onLateQuote}>试算折减</Button>
            {lateQuote && (
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="可上课次">{lateQuote.remainLessons}</Descriptions.Item>
                <Descriptions.Item label="折减课时">{lateQuote.discountHours}</Descriptions.Item>
                <Descriptions.Item label="折减金额">¥{Number(lateQuote.discountAmount || 0).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="实付金额">
                  <b style={{ color: '#cf1322' }}>¥{Number(lateQuote.payableAmount || 0).toFixed(2)}</b>
                </Descriptions.Item>
              </Descriptions>
            )}
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
