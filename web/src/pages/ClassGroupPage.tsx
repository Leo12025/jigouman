import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listClassGroups, createClassGroup, updateClassGroup, deleteClassGroup, listCourses } from '../api/crm';
import { useCrud } from '../hooks/useCrud';

export default function ClassGroupPage() {
  const { rows, total, page, size, loading, submitting, load, save, del } = useCrud({
    list: listClassGroups,
    create: createClassGroup,
    update: updateClassGroup,
    remove: deleteClassGroup,
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    load(1, size);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    // 修复：编辑时正确回填开班日期（dayjs 对象供 DatePicker 展示）
    form.setFieldsValue({ ...r, startDate: r.startDate ? dayjs(r.startDate) : undefined });
    setOpen(true);
  };
  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = { ...v };
    if (v.startDate) payload.startDate = v.startDate.format('YYYY-MM-DD');
    const ok = await save(editing, payload);
    if (ok) setOpen(false);
  };

  const courseOptions = useMemo(() => courses.map((c) => ({ value: c.id, label: c.name })), [courses]);

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '班级名称', dataIndex: 'name' },
    { title: '课程', dataIndex: 'courseId', width: 140, render: (v: number) => courses.find((c) => c.id === v)?.name || v },
    { title: '授课老师', dataIndex: 'teacherId', width: 100, render: (v: number) => v ?? '-' },
    { title: '容量', dataIndex: 'capacity', width: 80 },
    { title: '开班日期', dataIndex: 'startDate', width: 120, render: (v: string) => v || '-' },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该班级？" okText="删除" cancelText="取消" onConfirm={() => del(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [courseOptions]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>开班</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />
      <Modal title={editing ? '编辑班级' : '开班'} open={open} confirmLoading={submitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select showSearch optionFilterProp="label" options={courseOptions} />
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
