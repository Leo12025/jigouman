import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { listClassrooms, createClassroom, updateClassroom, deleteClassroom } from '../api/crm';

export default function VenuePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listClassrooms({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(1, size); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const submit = async () => {
    const v = await form.validateFields();
    if (editing) { await updateClassroom(editing.id, v); message.success('已保存'); }
    else { await createClassroom(v); message.success('创建成功'); }
    setOpen(false); load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (v: string) => v || '-' },
    { title: '容量', dataIndex: 'capacity', width: 80 },
    { title: '设备', dataIndex: 'equipment', render: (v: string[]) => (v || []).join('、') || '-' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 140, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
          <Popconfirm title="确认删除该教室？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteClassroom(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建教室</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />
      <Modal title={editing ? '编辑教室' : '新建教室'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Input placeholder="教室/舞蹈室/机房" /></Form.Item>
          <Form.Item name="capacity" label="容量"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="equipment" label="设备"><Select mode="tags" placeholder="如 投影/钢琴" /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
