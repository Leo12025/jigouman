import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, TimePicker, Tag, message, Popconfirm, Alert,
} from 'antd';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { listLessons, createLesson, updateLesson, deleteLesson, generateLessons, listClassGroups, listCourses } from '../api/crm';

const { RangePicker } = DatePicker;

const LESSON_STATUS: Record<string, string> = {
  SCHEDULED: '已排课', ONGOING: '进行中', FINISHED: '已结束', CANCELLED: '已取消', RESCHEDULED: '已调课',
};

export default function LessonPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [genResult, setGenResult] = useState<any>(null);
  const [form] = Form.useForm();
  const [genForm] = Form.useForm();

  const groupName = (id: number) => groups.find((g) => g.id === id)?.name || id;

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listLessons({ page: p, size: s, classGroupId: groupId });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listClassGroups({ page: 1, size: 200 }).then((r) => setGroups(r.list)).catch(() => undefined);
    listCourses({ page: 1, size: 200 }).then((r) => setCourses(r.list)).catch(() => undefined);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const submit = async () => {
    const v = await form.validateFields();
    const payload: any = {
      classGroupId: v.classGroupId,
      courseId: v.courseId,
      teacherId: v.teacherId,
      roomId: v.roomId,
      startTime: v.range[0].toISOString(),
      endTime: v.range[1].toISOString(),
    };
    if (editing) { await updateLesson(editing.id, payload); message.success('已保存'); }
    else { await createLesson(payload); message.success('排课成功'); }
    setOpen(false); load();
  };

  const submitGen = async () => {
    const v = await genForm.validateFields();
    const res = await generateLessons({
      classGroupId: v.classGroupId,
      startDate: v.range[0].format('YYYY-MM-DD'),
      endDate: v.range[1].format('YYYY-MM-DD'),
      teacherId: v.teacherId,
      roomId: v.roomId,
      slots: [{ weekday: v.weekday, start: v.time[0].format('HH:mm'), end: v.time[1].format('HH:mm') }],
    });
    setGenResult(res);
    message.success(`生成 ${res.createdCount} 条，跳过 ${res.skippedCount} 条`);
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '班级', dataIndex: 'classGroupId', width: 120, render: (v: number) => groupName(v) },
    { title: '老师', dataIndex: 'teacherId', width: 80, render: (v: number) => v ?? '-' },
    { title: '教室', dataIndex: 'roomId', width: 80, render: (v: number) => v ?? '-' },
    { title: '开始', dataIndex: 'startTime', width: 170, render: (v: string) => (v ? new Date(v).toLocaleString() : '-') },
    { title: '结束', dataIndex: 'endTime', width: 170, render: (v: string) => (v ? new Date(v).toLocaleString() : '-') },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag>{LESSON_STATUS[v] || v}</Tag> },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue({ classGroupId: r.classGroupId, courseId: r.courseId, teacherId: r.teacherId, roomId: r.roomId, range: [dayjs(r.startTime), dayjs(r.endTime)] }); setOpen(true); }}>调课</Button>
          <Popconfirm title="确认删除该课次？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteLesson(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="按班级筛选" allowClear style={{ width: 180 }}
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
          onChange={(v) => { setGroupId(v); }} />
        <Button type="primary" onClick={() => load(1, size)}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setGroupId(undefined); load(1, size); }}>重置</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>单条排课</Button>
        <Button icon={<ThunderboltOutlined />} onClick={() => { setGenResult(null); genForm.resetFields(); setGenOpen(true); }}>按周批量生成</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={editing ? '调课' : '单条排课'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="classGroupId" label="班级" rules={[{ required: true, message: '请选择班级' }]}>
            <Select showSearch optionFilterProp="label" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select showSearch optionFilterProp="label" options={courses.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="range" label="上课时间" rules={[{ required: true, message: '请选择时间' }]}>
            <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="teacherId" label="授课老师ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="roomId" label="教室ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="按周批量生成课次" open={genOpen} onOk={submitGen} onCancel={() => setGenOpen(false)} okText="生成" cancelText="取消" width={560}>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="按指定星期与时间，在日期区间内逐周生成课次；与已有课次冲突的时段会自动跳过。" />
        <Form form={genForm} layout="vertical"
          initialValues={{ weekday: 1, time: [dayjs('09:00', 'HH:mm'), dayjs('10:30', 'HH:mm')] }}>
          <Form.Item name="classGroupId" label="班级" rules={[{ required: true, message: '请选择班级' }]}>
            <Select showSearch optionFilterProp="label" options={groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="range" label="日期区间" rules={[{ required: true, message: '请选择区间' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="weekday" label="星期" rules={[{ required: true }]}>
            <Select options={[
              { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
              { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 7, label: '周日' },
            ]} />
          </Form.Item>
          <Form.Item name="time" label="上课时间" rules={[{ required: true, message: '请选择时间' }]}>
            <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="teacherId" label="授课老师ID(不填取班级默认)"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
          <Form.Item name="roomId" label="教室ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
        {genResult && (
          <Alert type={genResult.skippedCount ? 'warning' : 'success'} showIcon style={{ marginTop: 12 }}
            message={`成功生成 ${genResult.createdCount} 条，跳过 ${genResult.skippedCount} 条`}
            description={genResult.skipped?.length ? (
              <div style={{ fontSize: 12 }}>
                {genResult.skipped.map((s: any, i: number) => (<div key={i}>{s.date} — {s.reason}</div>))}
              </div>
            ) : undefined} />
        )}
      </Modal>
    </div>
  );
}
