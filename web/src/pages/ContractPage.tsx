import { useEffect, useState } from 'react';
import {
  Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import {
  listContractTemplates, createContractTemplate, deleteContractTemplate,
  listContracts, createContract, signContract, invalidateContract,
} from '../api/crm';

export default function ContractPage() {
  const [tplRows, setTplRows] = useState<any[]>([]);
  const [tplTotal, setTplTotal] = useState(0);
  const [contractRows, setContractRows] = useState<any[]>([]);
  const [contractTotal, setContractTotal] = useState(0);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm] = Form.useForm();
  const [signRow, setSignRow] = useState<any>(null);
  const [signForm] = Form.useForm();

  const loadTpl = async () => {
    const res = await listContractTemplates({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setTplRows(res.list); setTplTotal(res.total);
  };
  const loadContracts = async () => {
    const res = await listContracts({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setContractRows(res.list); setContractTotal(res.total);
  };
  useEffect(() => { loadTpl(); loadContracts(); /* eslint-disable-next-line */ }, []);

  const tplCols = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag> },
    { title: '操作', width: 140, render: (_: any, r: any) => (
      <Popconfirm title="删除模板?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteContractTemplate(r.id); message.success('已删除'); loadTpl(); }}>
        <Button type="link" danger size="small">删除</Button>
      </Popconfirm>
    ) },
  ];

  const contractCols = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '签约方', dataIndex: 'partyName' },
    { title: '证件号', dataIndex: 'idCard', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'SIGNED' ? 'green' : v === 'INVALID' ? 'default' : 'blue'}>{v}</Tag> },
    { title: '签署时间', dataIndex: 'signedAt', render: (v: string) => v || '-' },
    { title: '操作', width: 160, render: (_: any, r: any) => (
      <Space>
        {r.status === 'DRAFT' && <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => { setSignRow(r); signForm.resetFields(); signForm.setFieldsValue({ partyName: r.partyName, idCard: r.idCard }); }}>签署</Button>}
        {r.status !== 'INVALID' && <Popconfirm title="作废?" okText="作废" cancelText="取消" onConfirm={async () => { await invalidateContract(r.id); message.success('已作废'); loadContracts(); }}><Button type="link" danger size="small">作废</Button></Popconfirm>}
      </Space>
    ) },
  ];

  return (
    <div>
      <Tabs
        tabBarExtraContent={<Button type="primary" icon={<PlusOutlined />} onClick={() => { tplForm.resetFields(); tplForm.setFieldsValue({ type: 'ENROLL', status: 'ACTIVE' }); setTplOpen(true); }}>新建模板</Button>}
        items={[
          {
            key: 'tpl', label: '合同模板',
            children: <>
              <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadTpl}>刷新</Button></Space>
              <Table rowKey="id" size="small" dataSource={tplRows} columns={tplCols} pagination={{ total: tplTotal }} />
            </>,
          },
          {
            key: 'contract', label: '合同',
            children: <>
              <Space style={{ marginBottom: 12 }}><Button icon={<ReloadOutlined />} onClick={loadContracts}>刷新</Button></Space>
              <Table rowKey="id" size="small" dataSource={contractRows} columns={contractCols} pagination={{ total: contractTotal }} />
            </>,
          },
        ]}
      />

      <Modal title="新建合同模板" open={tplOpen} onOk={async () => { const v = await tplForm.validateFields(); await createContractTemplate(v); message.success('创建成功'); setTplOpen(false); loadTpl(); }} onCancel={() => setTplOpen(false)} okText="保存" cancelText="取消">
        <Form form={tplForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Input placeholder="ENROLL/EMPLOYEE/NDA" /></Form.Item>
          <Form.Item name="content" label="正文模板" rules={[{ required: true, message: '请输入正文' }]}><Input.TextArea rows={5} placeholder="支持 {name} {idCard} {amount} 占位" /></Form.Item>
          <Form.Item name="status" label="状态"><Input placeholder="ACTIVE" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`电子签署 - ${signRow?.partyName || ''}`} open={!!signRow} onOk={async () => { const v = await signForm.validateFields(); await signContract(signRow.id, v); message.success('签署完成(已存证)'); setSignRow(null); loadContracts(); }} onCancel={() => setSignRow(null)} okText="签署" cancelText="取消">
        <Form form={signForm} layout="vertical">
          <Form.Item name="partyName" label="签约方姓名" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="idCard" label="证件号(实名)" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="signatureResId" label="手写签名资源ID"><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
