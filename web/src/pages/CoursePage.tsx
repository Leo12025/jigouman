import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, message, Popconfirm, Tabs, Drawer, Descriptions,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listCourses, createCourse, updateCourse, deleteCourse,
  listCourseCategories, createCourseCategory, updateCourseCategory, deleteCourseCategory,
} from '../api/crm';

const COURSE_TYPES = [
  { value: 'ONE_ON_ONE', label: '一对一' },
  { value: 'SMALL_CLASS', label: '一对多小班' },
  { value: 'BIG_CLASS', label: '大班课' },
  { value: 'LIVE', label: '直播' },
  { value: 'RECORD', label: '录播' },
  { value: 'EXTERNAL', label: '外部课程' },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(COURSE_TYPES.map((t) => [t.value, t.label]));

export default function CoursePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState<string | undefined>();
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [catForm] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listCourses({ page: p, size: s, keyword });
      setRows(res.list);
      setTotal(res.total);
      setPage(p);
      setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  const loadCats = async () => { try { setCats(await listCourseCategories()); } catch { /* ignore */ } };

  useEffect(() => { load(1, size); loadCats(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ type: 'ONE_ON_ONE', status: 1 }); setOpen(true); };
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue(r); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) { await updateCourse(editing.id, v); message.success('已保存'); }
    else { await createCourse(v); message.success('创建成功'); }
    setOpen(false); load();
  };
  const remove = async (id: number) => { await deleteCourse(id); message.success('已删除'); load(); };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '课程名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag> },
    { title: '科目', dataIndex: 'subject', width: 90, render: (v: string) => v || '-' },
    { title: '年级', dataIndex: 'grade', width: 90, render: (v: string) => v || '-' },
    { title: '标价', dataIndex: 'price', width: 90 },
    { title: '课时数', dataIndex: 'totalHours', width: 80 },
    { title: '有效期(天)', dataIndex: 'validDays', width: 100, render: (v: number) => v ?? '-' },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>) },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该课程？" okText="删除" cancelText="取消" onConfirm={() => remove(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const catColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '分类名称', dataIndex: 'name' },
    { title: '父级', dataIndex: 'parentId', width: 80, render: (v: number) => v ?? '-' },
    { title: '排序', dataIndex: 'sort', width: 70, render: (v: number) => v ?? '-' },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setCatEditing(r); catForm.setFieldsValue(r); setCatOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除该分类？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteCourseCategory(r.id); message.success('已删除'); loadCats(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const courseTab = (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="课程名称" allowClear style={{ width: 200 }} onChange={(e) => setKeyword(e.target.value || undefined)} onPressEnter={() => load(1, size)} />
        <Button type="primary" onClick={() => load(1, size)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(undefined); load(1, size); }}>重置</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建课程</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />
    </div>
  );

  const catTab = (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCatEditing(null); catForm.resetFields(); setCatOpen(true); }}>新建分类</Button>
      </Space>
      <Table rowKey="id" size="small" columns={catColumns} dataSource={cats} pagination={false} />
    </div>
  );

  return (
    <div>
      <Tabs items={[{ key: 'course', label: '课程列表', children: courseTab }, { key: 'cat', label: '课程分类', children: catTab }]} />

      <Modal title={editing ? '编辑课程' : '新建课程'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="categoryId" label="课程分类">
            <Select allowClear options={cats.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="type" label="课程类型" rules={[{ required: true }]}><Select options={COURSE_TYPES} /></Form.Item>
          <Form.Item name="subject" label="科目"><Input /></Form.Item>
          <Form.Item name="grade" label="适用年级"><Input /></Form.Item>
          <Form.Item name="price" label="标价"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="totalHours" label="课时数"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="validDays" label="有效期(天)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="status" label="上架" valuePropName="checked" getValueProps={(v) => ({ checked: v === 1 })}>
            <Select options={[{ value: true, label: '上架' }, { value: false, label: '下架' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={catEditing ? '编辑分类' : '新建分类'} open={catOpen} onOk={async () => {
        const v = await catForm.validateFields();
        if (catEditing) { await updateCourseCategory(catEditing.id, v); message.success('已保存'); }
        else { await createCourseCategory(v); message.success('创建成功'); }
        setCatOpen(false); loadCats();
      }} onCancel={() => setCatOpen(false)} okText="保存" cancelText="取消">
        <Form form={catForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="parentId" label="父级分类">
            <Select allowClear options={cats.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
