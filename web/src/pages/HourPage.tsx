import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, message, Tabs,
} from 'antd';
import { PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import {
  listHourAccounts, listHourConsumptions, grantHours, listStudents, listCourses,
} from '../api/crm';

const ACCT_TYPE: Record<string, string> = { ONE_ON_ONE: '一对一', CLASS: '班课', GENERAL: '通用储值' };
const CONSUME_TYPE: Record<string, { label: string; color: string }> = {
  GRANT: { label: '发放', color: 'green' },
  CONSUME: { label: '消课', color: 'red' },
  ROLLBACK: { label: '回滚', color: 'orange' },
  FREEZE: { label: '冻结', color: 'gray' },
  EXPIRE: { label: '过期', color: 'gray' },
};
const LOW_BALANCE = 2;

export default function HourPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [totalAcc, setTotalAcc] = useState(0);
  const [totalCon, setTotalCon] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const studentName = (id?: number) => students.find((s) => s.id === id)?.name || id;
  const courseName = (id?: number) => (id ? courses.find((c) => c.id === id)?.name || id : '通用');

  const load = async () => {
    setLoading(true);
    try {
      const acc = await listHourAccounts({ page: 1, size: 100 });
      setAccounts(acc.list); setTotalAcc(acc.total);
      const con = await listHourConsumptions({ page: 1, size: 100 });
      setConsumptions(con.list); setTotalCon(con.total);
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
    await grantHours(v);
    message.success('已发放课时');
    setOpen(false); load();
  };

  const accColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag>{ACCT_TYPE[v]}</Tag> },
    {
      title: '可用课时', dataIndex: 'balance', width: 100, render: (v: number) =>
        v <= LOW_BALANCE ? <Tag color="warning"><WarningOutlined /> {v}</Tag> : v,
    },
    { title: '冻结', dataIndex: 'frozen', width: 70 },
    { title: '累计发放', dataIndex: 'totalGranted', width: 90 },
  ];

  const conColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '学员', dataIndex: 'studentId', width: 110, render: (v: number) => studentName(v) },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courseName(v) },
    { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag color={CONSUME_TYPE[v]?.color}>{CONSUME_TYPE[v]?.label}</Tag> },
    { title: '课时', dataIndex: 'hours', width: 80, render: (v: number) => (v > 0 ? `+${v}` : v) },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (v: string) => (v ? new Date(v).toLocaleString() : '-') },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ type: 'CLASS', hours: 1 }); setOpen(true); }}>手动发放课时</Button>
        {accounts.some((a) => a.balance <= LOW_BALANCE) && (
          <Tag color="warning"><WarningOutlined /> 存在 {accounts.filter((a) => a.balance <= LOW_BALANCE).length} 个低课时账户，建议续费</Tag>
        )}
      </Space>
      <Tabs
        items={[
          {
            key: 'accounts', label: `课时账户(${totalAcc})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={accColumns} dataSource={accounts} pagination={{ pageSize: 20 }} />
            ),
          },
          {
            key: 'consumptions', label: `课时流水(${totalCon})`, children: (
              <Table rowKey="id" size="small" loading={loading} columns={conColumns} dataSource={consumptions} pagination={{ pageSize: 20 }} />
            ),
          },
        ]}
      />

      <Modal title="手动发放课时" open={open} onOk={submitGrant} onCancel={() => setOpen(false)} okText="发放" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="学员" rules={[{ required: true, message: '请选择学员' }]}>
            <Select showSearch optionFilterProp="label" options={students.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="courseId" label="课程(留空=通用储值)">
            <Select allowClear options={courses.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(cid) => form.setFieldsValue({ type: cid ? 'CLASS' : 'GENERAL' })} />
          </Form.Item>
          <Form.Item name="type" label="账户类型"><Select options={Object.entries(ACCT_TYPE).map(([v, l]) => ({ value: v, label: l }))} /></Form.Item>
          <Form.Item name="hours" label="发放课时" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
