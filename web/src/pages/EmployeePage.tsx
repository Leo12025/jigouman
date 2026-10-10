import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listEmployees, createEmployee, updateEmployee, deleteEmployee,
  upsertTeacherProfile, listCertificates, addCertificate, deleteCertificate,
} from '../api/crm';

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  teacher: { label: '老师', color: 'blue' },
  academic: { label: '教务', color: 'cyan' },
  consultant: { label: '顾问', color: 'purple' },
  finance: { label: '财务', color: 'gold' },
  operation: { label: '运营', color: 'green' },
  admin: { label: '管理员', color: 'red' },
};

export default function EmployeePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  // 师资档案
  const [profileEmp, setProfileEmp] = useState<any>(null);
  const [profileForm] = Form.useForm();
  // 证书
  const [certEmp, setCertEmp] = useState<any>(null);
  const [certRows, setCertRows] = useState<any[]>([]);
  const [certOpen, setCertOpen] = useState(false);
  const [certForm] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listEmployees({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(1, size); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v };
    if (v.hireDate) payload.hireDate = v.hireDate.format('YYYY-MM-DD');
    if (editing) { await updateEmployee(editing.id, payload); message.success('已保存'); }
    else { await createEmployee(payload); message.success('创建成功'); }
    setOpen(false); load();
  };

  const openProfile = async (emp: any) => {
    setProfileEmp(emp);
    profileForm.resetFields();
    profileForm.setFieldsValue({
      subjects: emp.subjects || [], ageGroups: emp.ageGroups || [], bio: emp.bio || '',
    });
    setProfileEmp({ ...emp, _open: true });
  };
  const submitProfile = async () => {
    const v = await profileForm.validateFields();
    await upsertTeacherProfile(profileEmp.id, v);
    message.success('师资档案已保存');
    setProfileEmp(null);
  };

  const openCert = async (emp: any) => {
    setCertEmp(emp);
    const list = await listCertificates(emp.id).catch(() => []);
    setCertRows(list); setCertOpen(true);
  };
  const submitCert = async () => {
    const v = await certForm.validateFields();
    if (v.issuedAt) v.issuedAt = v.issuedAt.format('YYYY-MM-DD');
    if (v.expireAt) v.expireAt = v.expireAt.format('YYYY-MM-DD');
    await addCertificate(certEmp.id, v);
    message.success('已添加证书');
    certForm.resetFields();
    setCertRows(await listCertificates(certEmp.id));
  };
  const delCert = async (cid: number) => {
    await deleteCertificate(cid);
    setCertRows(await listCertificates(certEmp.id));
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name' },
    { title: '手机', dataIndex: 'phone', render: (v: string) => v || '-' },
    { title: '岗位', dataIndex: 'kind', render: (v: string) => <Tag color={KIND_LABELS[v]?.color}>{KIND_LABELS[v]?.label || v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '在职' : '离职'}</Tag> },
    { title: '入职', dataIndex: 'hireDate', render: (v: string) => v || '-' },
    {
      title: '操作', width: 260, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue({ ...r, hireDate: r.hireDate ? undefined : undefined }); setOpen(true); }}>编辑</Button>
          <Button type="link" size="small" onClick={() => openProfile(r)}>师资档案</Button>
          <Button type="link" size="small" onClick={() => openCert(r)}>证书</Button>
          <Popconfirm title="确认删除该员工？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteEmployee(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建员工</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={editing ? '编辑员工' : '新建员工'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机"><Input /></Form.Item>
          <Form.Item name="gender" label="性别"><Select allowClear options={[{ value: 'M', label: '男' }, { value: 'F', label: '女' }]} /></Form.Item>
          <Form.Item name="kind" label="岗位" rules={[{ required: true, message: '请选择岗位' }]}>
            <Select options={Object.entries(KIND_LABELS).map(([v, m]) => ({ value: v, label: m.label }))} />
          </Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '在职' }, { value: 'LEFT', label: '离职' }]} /></Form.Item>
          <Form.Item name="hireDate" label="入职日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`师资档案 - ${profileEmp?.name || ''}`} open={!!profileEmp?._open} onOk={submitProfile} onCancel={() => setProfileEmp(null)} okText="保存" cancelText="取消">
        <Form form={profileForm} layout="vertical">
          <Form.Item name="subjects" label="任教学科"><Select mode="tags" placeholder="输入或选择学科" /></Form.Item>
          <Form.Item name="ageGroups" label="擅长年龄段"><Select mode="tags" placeholder="如 6-8岁" /></Form.Item>
          <Form.Item name="bio" label="简介"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="avatarResId" label="头像资源ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`资质证书 - ${certEmp?.name || ''}`} open={certOpen} footer={null} onCancel={() => setCertOpen(false)}>
        <Form form={certForm} layout="vertical" style={{ marginBottom: 12 }}>
          <Space align="end">
            <Form.Item name="type" label="类型" rules={[{ required: true, message: '必填' }]}><Input placeholder="TEACHER_CERT" /></Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '必填' }]}><Input placeholder="教师资格证" /></Form.Item>
            <Form.Item name="issuer" label="颁发机构"><Input /></Form.Item>
            <Form.Item name="issuedAt" label="颁发日期"><DatePicker /></Form.Item>
            <Form.Item name="expireAt" label="到期日期"><DatePicker /></Form.Item>
            <Button type="primary" onClick={submitCert}>添加</Button>
          </Space>
        </Form>
        <Table rowKey="id" size="small" dataSource={certRows}
          columns={[
            { title: '类型', dataIndex: 'type' },
            { title: '名称', dataIndex: 'name' },
            { title: '颁发机构', dataIndex: 'issuer', render: (v: string) => v || '-' },
            { title: '到期', dataIndex: 'expireAt', render: (v: string) => v || '-' },
            { title: '操作', render: (_: any, r: any) => <Popconfirm title="删除?" onConfirm={() => delCert(r.id)}><Button type="link" danger size="small">删除</Button></Popconfirm> },
          ]} />
      </Modal>
    </div>
  );
}
