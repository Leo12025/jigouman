import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Drawer, Descriptions, Tabs, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listStudents, createStudent, updateStudent, deleteStudent, getStudent, bindParent, unbindParent, enrollCourse, listCourses, listClassGroups } from '../api/crm';

const STATUS: Record<string, string> = {
  STUDYING: '在读', SUSPENDED: '休学', GRADUATED: '结课', REFUNDED: '退费',
};

export default function StudentPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState<string | undefined>();
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [bindOpen, setBindOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [bindSubmitting, setBindSubmitting] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [bindForm] = Form.useForm();
  const [enrollForm] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listStudents({ page: p, size: s, keyword });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    listClassGroups({ page: 1, size: 200 }).then((r) => setGroups(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    setSaveSubmitting(true);
    try {
      if (editing) { await updateStudent(editing.id, v); message.success('已保存'); }
      else { await createStudent(v); message.success('创建成功'); }
      setOpen(false); load();
    } finally { setSaveSubmitting(false); }
  };

  const openDetail = async (r: any) => {
    setDetail(await getStudent(r.id));
  };

  const remove = async (r: any) => {
    await deleteStudent(r.id);
    message.success('已删除');
    load();
  };
  const unbind = async (parentId: number) => {
    await unbindParent({ studentId: detail.id, parentId });
    message.success('已解绑');
    setDetail(await getStudent(detail.id));
  };
  const submitBind = async () => {
    const v = await bindForm.validateFields();
    setBindSubmitting(true);
    try {
      await bindParent(v);
      message.success('已绑定');
      setBindOpen(false);
      setDetail(await getStudent(detail.id));
    } finally { setBindSubmitting(false); }
  };
  const submitEnroll = async () => {
    const v = await enrollForm.validateFields();
    setEnrollSubmitting(true);
    try {
      await enrollCourse(v);
      message.success('已报名');
      setEnrollOpen(false);
      setDetail(await getStudent(detail.id));
    } finally { setEnrollSubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', width: 110 },
    { title: '性别', dataIndex: 'gender', width: 70, render: (v: number) => (v === 2 ? '女' : '男') },
    { title: '学校', dataIndex: 'school', render: (v: string) => v || '-' },
    { title: '年级', dataIndex: 'grade', width: 90, render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'STUDYING' ? 'green' : 'default'}>{STATUS[v] || v}</Tag> },
    { title: '标签', dataIndex: 'tags', render: (v: string) => v || '-' },
    {
      title: '操作', width: 220, render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openDetail(r)}>详情</Button>
          <Button type="link" size="small" onClick={() => navigate(`/students/${r.id}/lifecycle`)}>全生命周期</Button>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除该学员？" okText="删除" cancelText="取消" onConfirm={() => remove(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ], []);

  return (
    <PageContainer title="学员档案">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="姓名" allowClear style={{ width: 180 }} onChange={(e) => setKeyword(e.target.value || undefined)} onPressEnter={() => load(1, size)} />
        <Button type="primary" onClick={() => load(1, size)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(undefined); load(1, size); }}>重置</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新建学员</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)}  scroll={{ x: 'max-content' }} />

      <Modal title={editing ? '编辑学员' : '新建学员'} open={open} confirmLoading={saveSubmitting} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
          <Form.Item name="gender" label="性别">
            <Select options={[{ value: 1, label: '男' }, { value: 2, label: '女' }]} />
          </Form.Item>
          <Form.Item name="school" label="学校"><Input /></Form.Item>
          <Form.Item name="grade" label="年级"><Input /></Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={Object.entries(STATUS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="学员详情" open={!!detail} onClose={() => setDetail(null)} width={720}
        extra={detail && <Button type="primary" size="small" onClick={() => navigate(`/students/${detail.id}/lifecycle`)}>全生命周期视图</Button>}>
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag>{STATUS[detail.status] || detail.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="学校">{detail.school || '-'}</Descriptions.Item>
              <Descriptions.Item label="年级">{detail.grade || '-'}</Descriptions.Item>
            </Descriptions>
            <Tabs
              items={[
                {
                  key: 'parents',
                  label: '家长',
                  children: (
                    <>
                      <Button type="primary" size="small" style={{ marginBottom: 8 }}
                        onClick={() => { bindForm.resetFields(); bindForm.setFieldsValue({ studentId: detail.id, isMain: true }); setBindOpen(true); }}>
                        绑定家长
                      </Button>
                      <Table rowKey="id" size="small" dataSource={detail.parents || []} pagination={false}
                        columns={[
                          { title: '姓名', dataIndex: 'parentName' },
                          { title: '手机号', dataIndex: 'phone' },
                          { title: '关系', dataIndex: 'relation', render: (v: string) => v || '-' },
                          { title: '主联系人', dataIndex: 'isMain', width: 90, render: (v: number) => (v === 1 ? <Tag color="blue">主</Tag> : '-') },
                          { title: '来源', dataIndex: 'bindSource', width: 80, render: (v: string) => v || '-' },
                          {
                            title: '操作', width: 80, render: (_: any, r: any) => (
                              <Popconfirm title="确认解绑该家长？" okText="解绑" cancelText="取消"
                                onConfirm={() => unbind(r.id)}>
                                <Button type="link" size="small" danger>解绑</Button>
                              </Popconfirm>
                            ),
                          },
                        ]}  scroll={{ x: 'max-content' }} />
                    </>
                  ),
                },
                {
                  key: 'courses',
                  label: '报名课程',
                  children: (
                    <>
                      <Button type="primary" size="small" style={{ marginBottom: 8 }}
                        onClick={() => { enrollForm.resetFields(); enrollForm.setFieldsValue({ studentId: detail.id }); setEnrollOpen(true); }}>
                        报名课程
                      </Button>
                      <Table rowKey="id" size="small" dataSource={detail.studentCourses || []} pagination={false}
                        columns={[
                          { title: '课程', dataIndex: 'courseId', render: (v: number) => courses.find((c) => c.id === v)?.name || v },
                          { title: '班级', dataIndex: 'classGroupId', render: (v: number) => (v ? groups.find((g) => g.id === v)?.name || v : '-') },
                          { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                        ]}  scroll={{ x: 'max-content' }} />
                    </>
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>

      <Modal title="绑定家长" open={bindOpen} confirmLoading={bindSubmitting} onOk={submitBind} onCancel={() => setBindOpen(false)} okText="保存" cancelText="取消">
        <Form form={bindForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" hidden><InputNumber /></Form.Item>
          <Form.Item name="parentName" label="家长姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}><Input /></Form.Item>
          <Form.Item name="relation" label="关系"><Input placeholder="父亲/母亲/其他" /></Form.Item>
          <Form.Item name="isMain" label="主联系人" valuePropName="checked"><Select options={[{ value: true, label: '是' }, { value: false, label: '否' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="报名课程" open={enrollOpen} confirmLoading={enrollSubmitting} onOk={submitEnroll} onCancel={() => setEnrollOpen(false)} okText="保存" cancelText="取消">
        <Form form={enrollForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" hidden><InputNumber /></Form.Item>
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="classGroupId" label="班级">
            <Select allowClear options={groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
