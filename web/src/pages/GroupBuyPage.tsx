import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Tag, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listGroupBuyActivities, createGroupBuyActivity, updateGroupBuyActivity, deleteGroupBuyActivity,
  createTeam, joinTeam, listTeams, redeemGroupBuy,
} from '../api/crm';

const STATUS_COLOR: Record<string, string> = { ACTIVE: 'green', DISABLED: 'default' };
const TEAM_COLOR: Record<string, string> = { OPEN: 'gold', SUCCESS: 'green', INVALID: 'red' };

export default function GroupBuyPage() {
  const { message } = App.useApp();
  const [acts, setActs] = useState<any[]>([]);
  const [actTotal, setActTotal] = useState(0);
  const [actOpen, setActOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [actForm] = Form.useForm();
  const [actSubmitting, setActSubmitting] = useState(false);

  const [teams, setTeams] = useState<any[]>([]);
  const [teamActId, setTeamActId] = useState<number | undefined>();
  const [openTeamAct, setOpenTeamAct] = useState(false);
  const [teamForm] = Form.useForm();
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinForm] = Form.useForm();
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinActId, setJoinActId] = useState<number | undefined>();

  const loadActs = useCallback(async () => {
    const r = await listGroupBuyActivities({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setActs(r.list); setActTotal(r.total);
  }, []);
  useEffect(() => { loadActs(); /* eslint-disable-next-line */ }, []);

  const loadTeams = useCallback(async (activityId: number) => {
    const r = await listTeams(activityId).catch(() => []);
    setTeams(r);
  }, []);

  const submitAct = async () => {
    const v = await actForm.validateFields();
    setActSubmitting(true);
    try {
      if (editing) await updateGroupBuyActivity(editing.id, v);
      else await createGroupBuyActivity(v);
      message.success('已保存'); setActOpen(false); loadActs();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setActSubmitting(false); }
  };
  const submitTeam = async () => {
    const v = await teamForm.validateFields();
    setTeamSubmitting(true);
    try { await createTeam({ ...v, activityId: teamActId }); message.success('已开团'); setOpenTeamAct(false); if (teamActId) loadTeams(teamActId); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setTeamSubmitting(false); }
  };
  const submitJoin = async () => {
    const v = await joinForm.validateFields();
    setJoinSubmitting(true);
    try { await joinTeam(v); message.success('已参团'); setJoinOpen(false); if (joinActId) loadTeams(joinActId); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setJoinSubmitting(false); }
  };

  const actCols = useMemo(() => [
    { title: '活动名', dataIndex: 'name' },
    { title: '团购价', dataIndex: 'price' },
    { title: '成团人数', dataIndex: 'groupSize' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag> },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    { title: '操作', width: 220, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setOpenTeamAct(true); setTeamActId(r.id); teamForm.resetFields(); loadTeams(r.id); }}>开团</Button>
        <Button type="link" size="small" onClick={() => { setJoinOpen(true); setJoinActId(r.id); joinForm.resetFields(); }}>参团</Button>
        <Button type="link" size="small" onClick={() => { setEditing(r); actForm.resetFields(); actForm.setFieldsValue(r); setActOpen(true); }}>编辑</Button>
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteGroupBuyActivity(r.id); message.success('已删除'); loadActs(); }}><Button type="link" danger size="small">删除</Button></Popconfirm>
      </Space>
    ) },
  ], [message, loadActs, loadTeams]);

  const teamCols = useMemo(() => [
    { title: '拼团码', dataIndex: 'code' },
    { title: '团长学员', dataIndex: 'leaderStudentId' },
    { title: '当前人数', dataIndex: 'currentSize' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={TEAM_COLOR[v] || 'default'}>{v}</Tag> },
    { title: '操作', width: 140, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" disabled={r.status === 'SUCCESS'} onClick={async () => { await redeemGroupBuy(r.code).catch(() => undefined); message.success('已核销'); if (teamActId) loadTeams(teamActId); }}>核销</Button>
      </Space>
    ) },
  ], [message, loadTeams, teamActId]);

  return (
    <PageContainer title="团购拼团">
      <Tabs items={[
        {
          key: 'act', label: '拼团活动',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<ReloadOutlined />} onClick={loadActs}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); actForm.resetFields(); actForm.setFieldsValue({ price: 0, groupSize: 2, status: 'ACTIVE' }); setActOpen(true); }}>新建活动</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={acts} columns={actCols} pagination={{ total: actTotal }} />
          </>,
        },
        {
          key: 'team', label: '拼团列表',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <span>活动：</span>
              <Select style={{ width: 240 }} placeholder="选择活动查看拼团" value={teamActId} onChange={(id) => { setTeamActId(id); loadTeams(id); }} options={acts.map((a) => ({ value: a.id, label: a.name }))} />
              <Button icon={<ReloadOutlined />} onClick={() => teamActId && loadTeams(teamActId)}>刷新</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={teams} columns={teamCols} pagination={false} />
          </>,
        },
      ]} />

      <Modal title={editing ? '编辑活动' : '新建拼团活动'} open={actOpen} confirmLoading={actSubmitting} onOk={submitAct} onCancel={() => setActOpen(false)} okText="保存" cancelText="取消">
        <Form form={actForm} layout="vertical">
          <Form.Item name="name" label="活动名" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="courseId" label="课程ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="price" label="团购价" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
          <Form.Item name="groupSize" label="成团人数" rules={[{ required: true }]}><InputNumber min={2} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="开团（指定团长）" open={openTeamAct} confirmLoading={teamSubmitting} onOk={submitTeam} onCancel={() => setOpenTeamAct(false)} okText="开团" cancelText="取消">
        <Form form={teamForm} layout="vertical">
          <Form.Item name="leaderStudentId" label="团长学员ID" rules={[{ required: true, message: '必填' }]}><InputNumber min={1} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="参团（输入拼团码）" open={joinOpen} confirmLoading={joinSubmitting} onOk={submitJoin} onCancel={() => setJoinOpen(false)} okText="参团" cancelText="取消">
        <Form form={joinForm} layout="vertical">
          <Form.Item name="code" label="拼团码" rules={[{ required: true, message: '必填' }]}><Input placeholder="如 GB123456" /></Form.Item>
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '必填' }]}><InputNumber min={1} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
