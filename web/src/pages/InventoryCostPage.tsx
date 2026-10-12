import { useEffect, useState, useMemo, useCallback } from 'react';
import { Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Tag, App } from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listMaterials, createMaterial, deleteMaterial, adjustStock, listCosts, createCost, deleteCost } from '../api/crm';

export default function InventoryCostPage() {
  const { message } = App.useApp();
  const [matRows, setMatRows] = useState<any[]>([]);
  const [matTotal, setMatTotal] = useState(0);
  const [costRows, setCostRows] = useState<any[]>([]);
  const [costTotal, setCostTotal] = useState(0);
  const [matOpen, setMatOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [matForm] = Form.useForm();
  const [costForm] = Form.useForm();
  const [stockRow, setStockRow] = useState<any>(null);
  const [stockForm] = Form.useForm();
  const [matSubmitting, setMatSubmitting] = useState(false);
  const [costSubmitting, setCostSubmitting] = useState(false);
  const [stockSubmitting, setStockSubmitting] = useState(false);

  const loadMat = useCallback(async () => {
    const r = await listMaterials({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setMatRows(r.list); setMatTotal(r.total);
  }, []);
  const loadCost = useCallback(async () => {
    const r = await listCosts({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setCostRows(r.list); setCostTotal(r.total);
  }, []);
  useEffect(() => { loadMat(); loadCost(); /* eslint-disable-next-line */ }, []);

  const submitMat = async () => {
    const v = await matForm.validateFields();
    setMatSubmitting(true);
    try { await createMaterial(v); message.success('创建成功'); setMatOpen(false); loadMat(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setMatSubmitting(false); }
  };
  const submitCost = async () => {
    const v = await costForm.validateFields();
    setCostSubmitting(true);
    try { await createCost(v); message.success('已登记'); setCostOpen(false); loadCost(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setCostSubmitting(false); }
  };
  const submitStock = async () => {
    const v = await stockForm.validateFields();
    setStockSubmitting(true);
    try { await adjustStock(stockRow.id, v); message.success('已记录'); setStockRow(null); loadMat(); }
    catch { /* 失败提示由请求层统一处理 */ } finally { setStockSubmitting(false); }
  };

  const matCols = useMemo(() => [
    { title: '名称', dataIndex: 'name' },
    { title: '类别', dataIndex: 'category', render: (v: string) => v || '-' },
    { title: '库存', dataIndex: 'stockQty' },
    { title: '预警', dataIndex: 'warningQty' },
    { title: '状态', render: (_: any, r: any) => r.stockQty <= r.warningQty ? <Tag color="red">低于预警</Tag> : <Tag color="green">正常</Tag> },
    { title: '操作', width: 160, render: (_: any, r: any) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setStockRow(r); stockForm.resetFields(); stockForm.setFieldsValue({ type: 'IN' }); }}>出入库</Button>
        <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteMaterial(r.id); message.success('已删除'); loadMat(); }}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ], [message, loadMat]);

  const costCols = useMemo(() => [
    { title: '类别', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
    { title: '金额', dataIndex: 'amount' },
    { title: '发生日期', dataIndex: 'occurredAt', render: (v: string) => v || '-' },
    { title: '备注', dataIndex: 'remark', render: (v: string) => v || '-' },
    { title: '操作', width: 100, render: (_: any, r: any) => (
      <Popconfirm title="删除?" okText="删除" cancelText="取消" onConfirm={async () => { await deleteCost(r.id); message.success('已删除'); loadCost(); }}>
        <Button type="link" danger size="small">删除</Button>
      </Popconfirm>
    ) },
  ], [message, loadCost]);

  return (
    <PageContainer title="库存成本">
      <Tabs items={[
        {
          key: 'mat', label: '教材库存',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<ReloadOutlined />} onClick={loadMat}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { matForm.resetFields(); matForm.setFieldsValue({ stockQty: 0, warningQty: 0 }); setMatOpen(true); }}>新建物料</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={matRows} columns={matCols} pagination={{ total: matTotal }}  scroll={{ x: 'max-content' }} />
          </>,
        },
        {
          key: 'cost', label: '机构成本',
          children: <>
            <Space style={{ marginBottom: 12 }}>
              <Button icon={<ReloadOutlined />} onClick={loadCost}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { costForm.resetFields(); costForm.setFieldsValue({ category: 'RENT', amount: 0 }); setCostOpen(true); }}>登记成本</Button>
            </Space>
            <Table rowKey="id" size="small" dataSource={costRows} columns={costCols} pagination={{ total: costTotal }}  scroll={{ x: 'max-content' }} />
          </>,
        },
      ]} />

      <Modal title="新建物料" open={matOpen} confirmLoading={matSubmitting} onOk={submitMat} onCancel={() => setMatOpen(false)} okText="保存" cancelText="取消">
        <Form form={matForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Form.Item name="category" label="类别"><Input placeholder="教材/耗材" /></Form.Item>
          <Form.Item name="unit" label="单位"><Input /></Form.Item>
          <Form.Item name="stockQty" label="初始库存"><InputNumber min={0} /></Form.Item>
          <Form.Item name="warningQty" label="预警库存"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`出入库 - ${stockRow?.name}`} open={!!stockRow} confirmLoading={stockSubmitting} onOk={submitStock} onCancel={() => setStockRow(null)} okText="提交" cancelText="取消">
        <Form form={stockForm} layout="vertical">
          <Form.Item name="type" label="类型" rules={[{ required: true }]}><Select options={[{ value: 'IN', label: '入库' }, { value: 'OUT', label: '出库' }]} /></Form.Item>
          <Form.Item name="qty" label="数量" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="remark" label="说明"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="登记成本" open={costOpen} confirmLoading={costSubmitting} onOk={submitCost} onCancel={() => setCostOpen(false)} okText="保存" cancelText="取消">
        <Form form={costForm} layout="vertical">
          <Form.Item name="category" label="类别" rules={[{ required: true }]}><Select options={[{ value: 'RENT', label: '房租' }, { value: 'SALARY', label: '工资' }, { value: 'MATERIAL', label: '物料' }, { value: 'MARKETING', label: '营销' }, { value: 'OTHER', label: '其他' }]} /></Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
