import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Tag, Card, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listClasses, createClass, updateClass, deleteClass, startClass, endClass,
  recordStudy, listStudy, studyStats,
} from '../api/crm';

const CLASS_COLOR: Record<string, string> = { SCHEDULED: 'default', LIVE: 'green', ENDED: 'blue' };
const STUDY_COLOR: Record<string, string> = { PRESENT: 'green', LATE: 'gold', ABSENT: 'red' };

export default function TeachingPage() {
  const { message } = App.useApp();
  const [classes, setClasses] = useState<any[]>([]);
  const [clsTotal, setClsTotal] = useState(0);
  const [clsOpen, setClsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [clsForm] = Form.useForm();
  const [clsSubmitting, setClsSubmitting] = useState(false);

  const [study, setStudy] = useState<any[]>([]);
  const [studyClassId, setStudyClassId] = useState<number | undefined>();
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyForm] = Form.useForm();
  const [studySubmitting, setStudySubmitting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const loadClasses = useCallback(async () => {
    const r = await listClasses({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setClasses(r.list); setClsTotal(r.total);
  }, []);
  const loadStudy = useCallback(async (classId: number) => {
    setStudyClassId(classId);
    const r = await listStudy(classId).catch(() => []);
    setStudy(r);
    const s = await studyStats(classId).catch(() => null);
    setStats(s);
  }, []);
  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, []);

  const submitCls = async () => {
    const v = await clsForm.validateFields();
    setClsSubmitting(true);
    try {
      if (editing) await updateClass(editing.id, v); else await createClass(v);
      message.success('已保存'); setClsOpen(false); loadClasses();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setClsSubmitting(false); }
  };
  const submitStudy = async () => {
    const v = await studyForm.validateFields();
    setStudySubmitting(true);
    try {
      await recordStudy(v);
      message.success('已记录'); setStudyOpen(false); if (v.classId) loadStudy(v.classId);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setStudySubmitting(false); }
  };

  const clsCols = useMemo(() => [
    { title: '标题', dataIndex: 'title' },
    { title: '讲师ID', dataIndex: 'teacherId' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={CLASS_COLOR[v] || 'default'}>{v}</Tag> },
    { title: '开始时间', dataIndex: 'startTime', render: (v: string) => v || '-' },
    { title: '操作', width: 230, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" disabled={r.status !== 'SCHEDULED'} onClick={async () => { await startClass(r.id); message.success('已开始'); loadClasses(); }}>开始</Button>
        <Button type="link" size="small" disabled={r.status !== 'LIVE'} onClick={async () => { await endClass(r.id); message.success('已结束'); loadClasses(); }}>结束</Button>
        <Button type="link" size="small" onClick={() => { setStudyClassId(r.id); studyForm.resetFields(); studyForm.setFieldsValue({ classId: r.id, status: 'PRESENT', durationSec: 0 }); setStudyOpen(true); if (studyClassId !== r.id) loadStudy(r.id); }}>督学打卡</Button>
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteClass(r.id); message.success('已删除'); loadClasses(); }}><Button type="link" danger size="small">删除</Button></Popconfirm>
      </Space>
    ) },
  ], [message, loadClasses]);

  const studyCols = useMemo(() => [
    { title: '学员ID', dataIndex: 'studentId' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STUDY_COLOR[v] || 'default'}>{v}</Tag> },
    { title: '时长(秒)', dataIndex: 'durationSec' },
    { title: '打卡时间', dataIndex: 'joinedAt', render: (v: string) => v || '-' },
  ], []);

  return (
    <PageContainer title="在线课堂/督学">
      <Tabs items={[
        {
          key: 'cls', label: '在线课堂',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<ReloadOutlined />} onClick={loadClasses}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); clsForm.resetFields(); clsForm.setFieldsValue({ status: 'SCHEDULED' }); setClsOpen(true); }}>创建课堂</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={classes} columns={clsCols} pagination={{ total: clsTotal }} />
          </>,
        },
        {
          key: 'study', label: '督学/出勤',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <span>课堂：</span>
              <Select style={{ width: 240 }} placeholder="选择课堂" value={studyClassId} onChange={loadStudy} options={classes.map((c) => ({ value: c.id, label: c.title }))} />
              <Button icon={<ReloadOutlined />} onClick={() => studyClassId && loadStudy(studyClassId)}>刷新</Button>
            </Space>
            {stats && (
              <Card size="small" style={{ marginBottom: 12 }}>
                出勤统计：共 {stats.total} 人 ｜ 出勤 {stats.byStatus.PRESENT || 0} ｜ 迟到 {stats.byStatus.LATE || 0} ｜ 缺勤 {stats.byStatus.ABSENT || 0}
              </Card>
            )}
            <Table rowKey="id" size="small" dataSource={study} columns={studyCols} pagination={false} />
          </>,
        },
      ]} />

      <Modal title={editing ? '编辑课堂' : '创建课堂'} open={clsOpen} confirmLoading={clsSubmitting} onOk={submitCls} onCancel={() => setClsOpen(false)} okText="保存" cancelText="取消">
        <Form form={clsForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="teacherId" label="讲师ID" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="courseId" label="课程ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="startTime" label="开始时间"><Input placeholder="2026-10-10 19:00" /></Form.Item>
          <Form.Item name="endTime" label="结束时间"><Input placeholder="2026-10-10 20:00" /></Form.Item>
          <Form.Item name="url" label="直播间地址"><Input /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ value: 'SCHEDULED', label: '待开始' }, { value: 'LIVE', label: '直播中' }, { value: 'ENDED', label: '已结束' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="督学打卡" open={studyOpen} confirmLoading={studySubmitting} onOk={submitStudy} onCancel={() => setStudyOpen(false)} okText="打卡" cancelText="取消">
        <Form form={studyForm} layout="vertical">
          <Form.Item name="classId" label="课堂ID" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="status" label="出勤状态" rules={[{ required: true }]}><Select options={[{ value: 'PRESENT', label: '出勤' }, { value: 'LATE', label: '迟到' }, { value: 'ABSENT', label: '缺勤' }]} /></Form.Item>
          <Form.Item name="durationSec" label="时长(秒)"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
