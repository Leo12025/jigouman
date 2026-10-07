import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listClassGroups, createClassGroup, updateClassGroup, deleteClassGroup, listCourses } from '../api/crm';

export default function ClassGroupPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listClassGroups({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v };
    if (v.startDate) payload.startDate = v.startDate.format('YYYY-MM-DD');
    if (editing) { await updateClassGroup(editing.id, payload); message.success('已保存'); }
    else { await createClassGroup(payload); message.success('创建成功'); }
    setOpen(false); load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '班级名称', dataIndex: 'name' },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courses.find((c) => c.id === v)?.name || v },
    { title: '授课老师', dataIndex: 'teacherId', width: 100, render: (v: number) => v ?? '-' },
    { title: '容量', dataIndex: 'capacity', width: 80 },
    { title: '开班日期', dataIndex: 'startDate', width: 120, render: (v: string) => v || '-' },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue({ ...r, startDate: r.startDate ? undefined : undefined }); setOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除该班级？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteClassGroup(r.id); message.success('已删除'); load(); }}>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>开班</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />
      <Modal title={editing ? '编辑班级' : '开班'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="name" label="班级名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="teacherId" label="授课老师ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="capacity" label="容量"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="startDate" label="开班日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
