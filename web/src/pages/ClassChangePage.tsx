import { useEffect, useState, useMemo } from 'react';
import { Tabs, Form, Select, InputNumber, Input, Button, Table, Tag, Space, DatePicker, App } from 'antd';
import { listStudents, listClassGroups, listLessons, listUsers, createTransfer, listTransfers, createReschedule, listReschedules } from '../api/crm';
import { formatDateTime } from '../utils/format';

const TSTATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'orange' },
  APPROVED: { label: '已通过', color: 'green' },
  REJECTED: { label: '已驳回', color: 'red' },
  DONE: { label: '已生效', color: 'blue' },
};

export default function ClassChangePage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState('transfer');
  const [students, setStudents] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [transferRows, setTransferRows] = useState<any[]>([]);
  const [reschedRows, setReschedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tSubmitting, setTSubmitting] = useState(false);
  const [rSubmitting, setRSubmitting] = useState(false);
  const [tForm] = Form.useForm();
  const [rForm] = Form.useForm();

  const loadTransfers = async () => { setLoading(true); try { const r = await listTransfers({ page: 1, size: 50 }); setTransferRows(r.list); } catch { /* ignore */ } finally { setLoading(false); } };
  const loadReschedules = async () => { setLoading(true); try { const r = await listReschedules({ page: 1, size: 50 }); setReschedRows(r.list); } catch { /* ignore */ } finally { setLoading(false); } };

  useEffect(() => {
    listStudents({ page: 1, size: 200 }).then((r) => setStudents(r.list)).catch(() => undefined);
    listClassGroups({ page: 1, size: 200 }).then((r) => setClassGroups(r.list)).catch(() => undefined);
    listLessons({ page: 1, size: 200 }).then((r) => setLessons(r.list)).catch(() => undefined);
    listUsers({ page: 1, size: 200 }).then((r) => setUsers(r.list)).catch(() => undefined);
    loadTransfers(); loadReschedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitTransfer = async () => {
    const v = await tForm.validateFields();
    setTSubmitting(true);
    try { await createTransfer(v); message.success('转班申请已提交，待审批'); tForm.resetFields(); loadTransfers(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setTSubmitting(false); }
  };
  const submitReschedule = async () => {
    const v = await rForm.validateFields();
    setRSubmitting(true);
    try {
      await createReschedule({
        lessonId: v.lessonId,
        newStartTime: v.newStartTime?.toISOString(),
        newEndTime: v.newEndTime?.toISOString(),
        newTeacherId: v.newTeacherId,
        reason: v.reason,
        approverId: v.approverId,
      });
      message.success('调课申请已提交，待审批'); rForm.resetFields(); loadReschedules();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setRSubmitting(false); }
  };

  const studentOpt = useMemo(() => students.map((s) => ({ value: s.id, label: s.name })), [students]);
  const cgOpt = useMemo(() => classGroups.map((c) => ({ value: c.id, label: c.name })), [classGroups]);
  const lessonOpt = useMemo(() => lessons.map((l) => ({ value: l.id, label: `课次#${l.id} ${l.startTime ? formatDateTime(l.startTime) : ''}` })), [lessons]);
  const userOpt = useMemo(() => users.map((u) => ({ value: u.id, label: u.name || u.username })), [users]);

  const transferCols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '学员', dataIndex: 'studentId', render: (v: number) => students.find((s) => s.id === v)?.name || v },
    { title: '原班级→目标班级', render: (_: any, r: any) => `${classGroups.find((c) => c.id === r.fromClassGroupId)?.name || r.fromClassGroupId} → ${classGroups.find((c) => c.id === r.toClassGroupId)?.name || r.toClassGroupId}` },
    { title: '补差价', dataIndex: 'diffAmount', width: 100, render: (v: number) => `¥${v || 0}` },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={TSTATUS[v]?.color}>{TSTATUS[v]?.label}</Tag> },
    { title: '审批实例', dataIndex: 'approvalInstanceId', width: 100, render: (v: number) => v ? `#${v}` : '-' },
  ], [students, classGroups]);

  const reschedCols = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '课次', dataIndex: 'lessonId', width: 90 },
    { title: '新开始', dataIndex: 'newStartTime', render: (v: string) => formatDateTime(v) },
    { title: '新结束', dataIndex: 'newEndTime', render: (v: string) => formatDateTime(v) },
    { title: '新老师', dataIndex: 'newTeacherId', width: 90, render: (v: number) => (v ? users.find((u) => u.id === v)?.name || v : '-') },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={TSTATUS[v]?.color}>{TSTATUS[v]?.label}</Tag> },
    { title: '审批实例', dataIndex: 'approvalInstanceId', width: 100, render: (v: number) => v ? `#${v}` : '-' },
  ], [users]);

  return (
    <div>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'transfer', label: '转班申请' },
        { key: 'reschedule', label: '调课申请' },
      ]} />

      {tab === 'transfer' && (
        <>
          <Form form={tForm} layout="vertical" style={{ maxWidth: 560, marginBottom: 16 }}>
            <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
              <Select showSearch optionFilterProp="label" options={studentOpt} />
            </Form.Item>
            <Space wrap>
              <Form.Item name="fromClassGroupId" label="原班级" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" style={{ width: 200 }} options={cgOpt} />
              </Form.Item>
              <Form.Item name="toClassGroupId" label="目标班级" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" style={{ width: 200 }} options={cgOpt} />
              </Form.Item>
            </Space>
            <Form.Item name="diffAmount" label="转班补差价(元)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="reason" label="转班原因"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="approverId" label="审批人(兜底)" tooltip="已配置审批流模板时优先走模板，此处仅在未配置模板时作为单节点审批人兜底"
              rules={[{ required: true, message: '请选择兜底审批人' }]}>
              <Select showSearch optionFilterProp="label" style={{ width: 200 }} options={userOpt} />
            </Form.Item>
            <Button type="primary" loading={tSubmitting} onClick={submitTransfer}>提交转班申请</Button>
          </Form>
          <Table rowKey="id" size="small" loading={loading} columns={transferCols} dataSource={transferRows} pagination={false} />
        </>
      )}

      {tab === 'reschedule' && (
        <>
          <Form form={rForm} layout="vertical" style={{ maxWidth: 560, marginBottom: 16 }}>
            <Form.Item name="lessonId" label="课次" rules={[{ required: true, message: '请选择课次' }]}>
              <Select showSearch optionFilterProp="label" options={lessonOpt} />
            </Form.Item>
            <Space wrap>
              <Form.Item name="newStartTime" label="新开始时间" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: 220 }} />
              </Form.Item>
              <Form.Item name="newEndTime" label="新结束时间" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: 220 }} />
              </Form.Item>
            </Space>
            <Form.Item name="newTeacherId" label="新授课老师"><Select allowClear showSearch optionFilterProp="label" style={{ width: 200 }} options={userOpt} /></Form.Item>
            <Form.Item name="reason" label="调课原因"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="approverId" label="审批人(兜底)" tooltip="已配置审批流模板时优先走模板，此处仅在未配置模板时作为单节点审批人兜底"
              rules={[{ required: true, message: '请选择兜底审批人' }]}>
              <Select showSearch optionFilterProp="label" style={{ width: 200 }} options={userOpt} />
            </Form.Item>
            <Button type="primary" loading={rSubmitting} onClick={submitReschedule}>提交调课申请</Button>
          </Form>
          <Table rowKey="id" size="small" loading={loading} columns={reschedCols} dataSource={reschedRows} pagination={false} />
        </>
      )}
    </div>
  );
}
