import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, List, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  listCoursePackages, createCoursePackage, updateCoursePackage, deleteCoursePackage,
  listPackageCourses, addPackageCourses, removePackageCourse, purchaseCoursePackage, listCourses,
} from '../api/crm';

export default function CoursePackagePage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ value: number; label: string }[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [courseOpen, setCourseOpen] = useState(false);
  const [curPkg, setCurPkg] = useState<any>(null);
  const [pkgCourses, setPkgCourses] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  const [buyOpen, setBuyOpen] = useState(false);
  const [buyForm] = Form.useForm();
  const [buySubmitting, setBuySubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listCoursePackages({ page, size: 20, status });
      setData(r.list || []);
      setTotal(r.total || 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);
  useEffect(() => {
    listCourses({ size: 200 })
      .then((r: any) => { const list = r.list || []; setCourses(list); setCourseOptions(list.map((c: any) => ({ value: c.id, label: c.name }))); })
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, totalHours: 0, price: 0 });
    setEditOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    form.setFieldsValue(r);
    setEditOpen(true);
  };
  const onSubmit = async () => {
    const v = await form.validateFields();
    setEditSubmitting(true);
    try {
      if (editing) await updateCoursePackage(editing.id, v);
      else await createCoursePackage(v);
      message.success(editing ? '已保存' : '已创建课包');
      setEditOpen(false);
      load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setEditSubmitting(false); }
  };

  const openCourses = async (r: any) => {
    setCurPkg(r);
    setSelectedCourseIds([]);
    const list = await listPackageCourses(r.id).catch(() => []);
    setPkgCourses(list || []);
    setCourseOpen(true);
  };
  const onAddCourses = async () => {
    if (!selectedCourseIds.length) { message.warning('请选择课程'); return; }
    const list = await addPackageCourses(curPkg.id, selectedCourseIds);
    setPkgCourses(list || []);
    setSelectedCourseIds([]);
    message.success('已关联课程');
  };
  const onRemoveCourse = async (courseId: number) => {
    await removePackageCourse(curPkg.id, courseId);
    setPkgCourses((l) => l.filter((x) => x.courseId !== courseId));
    message.success('已移除');
  };

  const openBuy = (r: any) => {
    setCurPkg(r);
    buyForm.resetFields();
    buyForm.setFieldsValue({ hours: r.totalHours });
    setBuyOpen(true);
  };
  const onBuy = async () => {
    const v = await buyForm.validateFields();
    setBuySubmitting(true);
    try {
      await purchaseCoursePackage(curPkg.id, v);
      message.success('已发放课包课时');
      setBuyOpen(false);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setBuySubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '套餐名称', dataIndex: 'name' },
    { title: '总课时', dataIndex: 'totalHours', width: 90 },
    { title: '有效期(天)', dataIndex: 'validDays', width: 100, render: (v: number) => v ?? '-' },
    { title: '标价', dataIndex: 'price', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '上架' : '下架'}</Tag>,
    },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => openCourses(r)}>关联课程</Button>
          <Button size="small" type="primary" onClick={() => openBuy(r)}>购课发放</Button>
          <Button size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该课包？" onConfirm={async () => { await deleteCoursePackage(r.id); load(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <PageContainer title="课包管理">
      <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <Select
          placeholder="状态" allowClear style={{ width: 120 }}
          value={status} onChange={setStatus}
          options={[{ value: 1, label: '上架' }, { value: 0, label: '下架' }]}
        />
        <Button type="primary" onClick={openCreate}>新建课包</Button>
      </Space>

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        size="small"
      />

      <Modal
        title={editing ? `编辑课包 #${editing.id}` : '新建课包'}
        open={editOpen} confirmLoading={editSubmitting} onOk={onSubmit} onCancel={() => setEditOpen(false)} okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="如：年课套餐" />
          </Form.Item>
          <Space>
            <Form.Item name="totalHours" label="总课时" rules={[{ required: true, message: '请输入总课时' }]}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="validDays" label="有效期(天)">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item name="price" label="标价" rules={[{ required: true, message: '请输入标价' }]}>
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 1, label: '上架' }, { value: 0, label: '下架' }]} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`课包「${curPkg?.name ?? ''}」可上课程`}
        open={courseOpen} onCancel={() => setCourseOpen(false)}
        footer={null} width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Select
              mode="multiple" allowClear style={{ width: 360 }}
              placeholder="选择要关联的课程"
              value={selectedCourseIds} onChange={setSelectedCourseIds}
              options={courseOptions}
            />
            <Button type="primary" onClick={onAddCourses}>添加</Button>
          </Space>
          <List
            size="small" bordered
            dataSource={pkgCourses}
            locale={{ emptyText: '暂未关联课程' }}
            renderItem={(c: any) => (
              <List.Item
                actions={[
                  <Button key="rm" size="small" danger onClick={() => onRemoveCourse(c.courseId)}>移除</Button>,
                ]}
              >
                {c.name || `课程#${c.courseId}`}
              </List.Item>
            )}
          />
        </Space>
      </Modal>

      <Modal
        title={`购课发放「${curPkg?.name ?? ''}」`}
        open={buyOpen} confirmLoading={buySubmitting} onOk={onBuy} onCancel={() => setBuyOpen(false)} okText="发放"
      >
        <Form form={buyForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '请输入学员ID' }]}>
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="hours" label="发放课时(默认套餐总课时)">
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
