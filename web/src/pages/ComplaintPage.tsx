import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, Tag, Space, App } from 'antd';
import { listComplaints, createComplaint, assignComplaint, resolveComplaint, listAllUsers } from '../api/crm';

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: '电话', WECHAT: '微信', WALKIN: '到店', OTHER: '其他',
};
const LEVEL_COLOR: Record<string, string> = { LOW: 'green', MEDIUM: 'gold', HIGH: 'red' };
const STATUS_LABEL: Record<string, string> = {
  PENDING: '待分派', PROCESSING: '处理中', RESOLVED: '已处理', CLOSED: '已关闭',
};

export default function ComplaintPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [level, setLevel] = useState<string | undefined>();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [cur, setCur] = useState<any>(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listComplaints({ page, size: 20, status, level });
      setData(r.list || []);
      setTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status, level]);
  useEffect(() => {
    listAllUsers({}).then((r: any) => setUsers(r.list || [])).catch(() => undefined);
  }, []);

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const userOptions = useMemo(() => users.map((u) => ({ value: u.id, label: u.name })), [users]);

  const onCreate = async () => {
    const v = await form.validateFields();
    setCreateSubmitting(true);
    try { await createComplaint(v); message.success('已登记客诉'); setCreateOpen(false); form.resetFields(); load(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setCreateSubmitting(false); }
  };
  const onAssign = async () => {
    const v = await assignForm.validateFields();
    setAssignSubmitting(true);
    try { await assignComplaint(cur.id, v.assigneeId); message.success('已分派'); setAssignOpen(false); load(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setAssignSubmitting(false); }
  };
  const onResolve = async () => {
    const v = await resolveForm.validateFields();
    setResolveSubmitting(true);
    try { await resolveComplaint(cur.id, v.resolution); message.success('已处理'); setResolveOpen(false); load(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setResolveSubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '标题', dataIndex: 'title' },
    { title: '等级', dataIndex: 'level', render: (l: string) => <Tag color={LEVEL_COLOR[l] || 'default'}>{l}</Tag> },
    { title: '来源', dataIndex: 'channel', render: (c: string) => CHANNEL_LABEL[c] || c },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag>{STATUS_LABEL[s] || s}</Tag> },
    { title: '处理人', dataIndex: 'assigneeId', render: (a: number) => (a ? (userMap[a] || a) : '-') },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Space>
          {r.status !== 'RESOLVED' && r.status !== 'CLOSED' && (
            <Button size="small" onClick={() => { setCur(r); setAssignOpen(true); }}>分派</Button>
          )}
          {r.status !== 'RESOLVED' && r.status !== 'CLOSED' && (
            <Button size="small" type="primary" onClick={() => { setCur(r); setResolveOpen(true); }}>处理</Button>
          )}
        </Space>
      ),
    },
  ], [userMap]);

  return (
    <div>
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <Select
            placeholder="状态" allowClear style={{ width: 120 }}
            value={status} onChange={setStatus}
            options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select
            placeholder="等级" allowClear style={{ width: 120 }}
            value={level} onChange={setLevel}
            options={Object.entries(LEVEL_COLOR).map(([k]) => ({ value: k, label: k }))}
          />
        </Space>
        <Button type="primary" onClick={() => setCreateOpen(true)}>登记客诉</Button>
      </Space>

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        size="small"
      />

      <Modal title="登记客诉" open={createOpen} confirmLoading={createSubmitting} onOk={onCreate} onCancel={() => setCreateOpen(false)} okText="提交">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：教室空调太冷" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={3} placeholder="客诉详情" />
          </Form.Item>
          <Form.Item name="channel" label="来源" initialValue="OTHER">
            <Select options={Object.entries(CHANNEL_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="level" label="等级" initialValue="MEDIUM">
            <Select options={Object.entries(LEVEL_COLOR).map(([k, v]) => ({ value: k, label: k }))} />
          </Form.Item>
          <Form.Item name="assigneeId" label="分派给(留空则待分派)">
            <Select allowClear placeholder="选择处理人" showSearch optionFilterProp="label" options={userOptions} />
          </Form.Item>
          <Space>
            <Form.Item name="studentId" label="关联学员ID(可选)"><InputNumber style={{ width: 150 }} /></Form.Item>
            <Form.Item name="courseId" label="关联课程ID(可选)"><InputNumber style={{ width: 150 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal title={`分派客诉 #${cur?.id ?? ''}`} open={assignOpen} confirmLoading={assignSubmitting} onOk={onAssign} onCancel={() => setAssignOpen(false)} okText="分派">
        <Form form={assignForm} layout="vertical">
          <Form.Item name="assigneeId" label="处理人" rules={[{ required: true, message: '请选择处理人' }]}>
            <Select showSearch optionFilterProp="label" options={userOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`处理客诉 #${cur?.id ?? ''}`} open={resolveOpen} confirmLoading={resolveSubmitting} onOk={onResolve} onCancel={() => setResolveOpen(false)} okText="标记已处理">
        <Form form={resolveForm} layout="vertical">
          <Form.Item name="resolution" label="处理结论" rules={[{ required: true, message: '请输入处理结论' }]}>
            <Input.TextArea rows={3} placeholder="处理方案与结果" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
