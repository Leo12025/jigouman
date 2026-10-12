import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Tag, Popconfirm, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listMemberLevels, createMemberLevel, deleteMemberLevel, listMembers, adjustPoints, listPointLedger } from '../api/crm';

export default function MemberPage() {
  const { message } = App.useApp();
  const [levels, setLevels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [lvOpen, setLvOpen] = useState(false);
  const [lvForm] = Form.useForm();
  const [lvSubmitting, setLvSubmitting] = useState(false);
  const [adj, setAdj] = useState<any>(null);
  const [adjForm] = Form.useForm();
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);

  const loadLevels = useCallback(async () => {
    const r = await listMemberLevels({}).catch(() => []);
    setLevels(r);
  }, []);
  const loadMembers = useCallback(async () => {
    const r = await listMembers({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setMembers(r.list);
    setTotal(r.total);
  }, []);
  useEffect(() => { loadLevels(); loadMembers(); /* eslint-disable-next-line */ }, []);

  const submitLv = async () => {
    const v = await lvForm.validateFields();
    setLvSubmitting(true);
    try {
      await createMemberLevel(v);
      message.success('创建成功');
      setLvOpen(false);
      loadLevels();
    } catch {
      // 失败提示由请求层统一处理
    } finally {
      setLvSubmitting(false);
    }
  };
  const submitAdj = async () => {
    const v = await adjForm.validateFields();
    setAdjSubmitting(true);
    try {
      await adjustPoints(adj.studentId, v);
      message.success('已调整');
      setAdj(null);
      loadMembers();
    } catch {
      // 失败提示由请求层统一处理
    } finally {
      setAdjSubmitting(false);
    }
  };

  const lvCols = useMemo(() => [
    { title: '等级名', dataIndex: 'name' },
    { title: '序', dataIndex: 'level' },
    { title: '所需积分', dataIndex: 'minPoints' },
    { title: '折扣%', dataIndex: 'discount' },
    { title: '操作', width: 100, render: (_: any, r: any) => (
      <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteMemberLevel(r.id); message.success('已删除'); loadLevels(); }}>
        <Button type="link" danger size="small">删除</Button>
      </Popconfirm>
    ) },
  ], [message, loadLevels]);

  const memCols = useMemo(() => [
    { title: '学员', dataIndex: 'studentId', width: 90 },
    { title: '等级ID', dataIndex: 'levelId' },
    { title: '当前积分', dataIndex: 'points' },
    { title: '累计积分', dataIndex: 'totalPoints' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'NORMAL' ? 'green' : 'default'}>{v}</Tag> },
    { title: '操作', width: 160, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setAdj(r); adjForm.resetFields(); adjForm.setFieldsValue({ points: 10 }); }}>加减分</Button>
        <Button type="link" size="small" onClick={async () => { setLedger(await listPointLedger(r.studentId)); }}>流水</Button>
      </Space>
    ) },
  ], []);

  return (
    <PageContainer title="会员管理">
      <Tabs
        tabBarExtraContent={<Button type="primary" icon={<PlusOutlined />} onClick={() => { lvForm.resetFields(); lvForm.setFieldsValue({ level: 1, minPoints: 0, discount: 0, status: 'ACTIVE' }); setLvOpen(true); }}>新建等级</Button>}
        items={[
          { key: 'lv', label: '会员等级', children: <>
            <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadLevels}>刷新</Button></Space>
            <Table rowKey="id" size="small" dataSource={levels} columns={lvCols} pagination={false}  scroll={{ x: 'max-content' }} />
          </> },
          { key: 'mem', label: '会员', children: <>
            <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadMembers}>刷新</Button></Space>
            <Table rowKey="id" size="small" dataSource={members} columns={memCols} pagination={{ total }}  scroll={{ x: 'max-content' }} />
            <Table style={{ marginTop: 12 }} size="small" title={() => '积分流水'} rowKey="id" dataSource={ledger}
              columns={[{ title: '类型', dataIndex: 'type' }, { title: '分值', dataIndex: 'points' }, { title: '说明', dataIndex: 'remark', render: (v: string) => v || '-' }]} pagination={false}  scroll={{ x: 'max-content' }} />
          </> },
        ]}
      />

      <Modal title="新建会员等级" open={lvOpen} confirmLoading={lvSubmitting} onOk={submitLv} onCancel={() => setLvOpen(false)} okText="保存" cancelText="取消">
        <Form form={lvForm} layout="vertical">
          <Form.Item name="name" label="等级名" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="level" label="顺序"><InputNumber min={1} /></Form.Item>
          <Form.Item name="minPoints" label="所需累计积分"><InputNumber min={0} /></Form.Item>
          <Form.Item name="discount" label="折扣(%)"><InputNumber min={0} max={100} /></Form.Item>
          <Form.Item name="status" label="状态"><Input placeholder="ACTIVE" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`积分调整 - 学员${adj?.studentId}`} open={!!adj} confirmLoading={adjSubmitting} onOk={submitAdj} onCancel={() => setAdj(null)} okText="提交" cancelText="取消">
        <Form form={adjForm} layout="vertical">
          <Form.Item name="points" label="分值(正发放/负扣减)" rules={[{ required: true, message: '必填' }]}><InputNumber /></Form.Item>
          <Form.Item name="remark" label="说明"><Input /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
