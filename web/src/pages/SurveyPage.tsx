import { useEffect, useState } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listSurveyTemplates, createSurveyTemplate, deleteSurveyTemplate, submitSurvey, listSurveyResponses, surveyStats } from '../api/crm';

export default function SurveyPage() {
  const [tpls, setTpls] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [resps, setResps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState<any>(null);

  const loadTpl = async () => { const r = await listSurveyTemplates({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 })); setTpls(r.list); setTotal(r.total); };
  const loadResp = async () => { const r = await listSurveyResponses({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 })); setResps(r.list); };
  useEffect(() => { loadTpl(); loadResp(); /* eslint-disable-next-line */ }, []);

  const tplCols = [
    { title: '标题', dataIndex: 'title' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag> },
    { title: '操作', width: 200, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={async () => { setStats(await surveyStats(r.id)); }}>统计</Button>
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteSurveyTemplate(r.id); message.success('已删除'); loadTpl(); }}><Button type="link" danger size="small">删除</Button></Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      <Tabs
        tabBarExtraContent={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ type: 'SATISFACTION', status: 'ACTIVE' }); setOpen(true); }}>新建问卷</Button>}
        items={[
          { key: 'tpl', label: '问卷模板', children: <>
            <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadTpl}>刷新</Button></Space>
            <Table rowKey="id" size="small" dataSource={tpls} columns={tplCols} pagination={{ total }} />
          </> },
          { key: 'resp', label: '回收', children: <>
            <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadResp}>刷新</Button></Space>
            <Table rowKey="id" size="small" dataSource={resps} columns={[
              { title: '模板', dataIndex: 'templateId' }, { title: '学员', dataIndex: 'studentId', render: (v: number) => v || '-' },
              { title: '评分', dataIndex: 'score', render: (v: number) => v ?? '-' },
            ]} pagination={false} />
            {stats && <div style={{ marginTop: 12 }}>统计：样本 {stats.count} · 平均分 {stats.avgScore} · 分布 {JSON.stringify(stats.distribution)}</div>}
          </> },
        ]}
      />
      <Modal title="新建问卷" open={open} onOk={async () => { const v = await form.validateFields(); await createSurveyTemplate(v); message.success('创建成功'); setOpen(false); loadTpl(); }} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={[{ value: 'NPS', label: 'NPS' }, { value: 'SATISFACTION', label: '满意度' }, { value: 'QUESTIONNAIRE', label: '普通问卷' }]} /></Form.Item>
          <Form.Item name="status" label="状态"><Input placeholder="ACTIVE" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
