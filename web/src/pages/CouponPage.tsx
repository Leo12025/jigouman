import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Tag, Drawer,
  Switch, Divider, Card, App,
} from 'antd';
import { PlusOutlined, ReloadOutlined, GiftOutlined, CalculatorOutlined } from '@ant-design/icons';
import {
  listCouponTemplates, createCouponTemplate, updateCouponTemplate, deleteCouponTemplate,
  grantCoupon, listCoupons, calcPromotion, listCourses, listClassGroups,
} from '../api/crm';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DISCOUNT: { label: '折扣', color: 'blue' },
  AMOUNT: { label: '满减', color: 'green' },
  FULL_REDUCTION: { label: '阶梯满减', color: 'cyan' },
  FREE_CLASS: { label: '课时券', color: 'purple' },
  GIFT: { label: '买赠', color: 'magenta' },
  FLASH: { label: '限时特价', color: 'volcano' },
};

const TAG_OPTIONS = ['NEW', 'OLD', 'VIP', 'TRIAL', 'CHURN'].map((t) => ({ value: t, label: t }));

export default function CouponPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [type, setType] = useState('AMOUNT');

  const [grantTpl, setGrantTpl] = useState<any>(null);
  const [grantForm] = Form.useForm();
  const [grants, setGrants] = useState<any[]>([]);
  const [grantOpen, setGrantOpen] = useState(false);

  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm] = Form.useForm();
  const [calcRes, setCalcRes] = useState<any>(null);

  const [courses, setCourses] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [calcSubmitting, setCalcSubmitting] = useState(false);

  const load = async (p = page, s = size) => {
    setLoading(true);
    try {
      const res = await listCouponTemplates({ page: p, size: s });
      setRows(res.list); setTotal(res.total); setPage(p); setSize(s);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => {
    load(1, size);
    listCourses({ size: 200 }).then((r: any) => setCourses(r.list || [])).catch(() => undefined);
    listClassGroups({ size: 200 }).then((r: any) => setClassGroups(r.list || [])).catch(() => undefined);
    // eslint-disable-next-line
  }, []);

  const openCreate = () => {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ type: 'AMOUNT', value: 0, minSpend: 0, perLimit: 1, validDays: 30, status: 'ACTIVE', stackable: 1, maxStack: 3, priority: 0, autoApply: 0 });
    setType('AMOUNT'); setOpen(true);
  };
  const submitTemplate = async () => {
    const v = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) { await updateCouponTemplate(editing.id, v); message.success('已保存'); }
      else { await createCouponTemplate(v); message.success('创建成功'); }
      setOpen(false); load();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setSubmitting(false); }
  };

  const openGrant = async (tpl: any) => {
    setGrantTpl(tpl);
    grantForm.resetFields();
    grantForm.setFieldsValue({ templateId: tpl.id, count: 1 });
    const list = await listCoupons({ templateId: tpl.id, size: 200 }).catch(() => ({ list: [] }));
    setGrants(list.list); setGrantOpen(true);
  };
  const submitGrant = async () => {
    const v = await grantForm.validateFields();
    setGrantSubmitting(true);
    try {
      await grantCoupon(v);
      message.success('已发放');
      const list = await listCoupons({ templateId: v.templateId, size: 200 });
      setGrants(list.list);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setGrantSubmitting(false); }
  };

  const doCalc = async () => {
    const v = await calcForm.validateFields();
    setCalcSubmitting(true);
    try {
      const res = await calcPromotion({
        amount: v.amount,
        studentTags: v.studentTags || [],
        codes: (v.codes || '').split(/[\s,]+/).filter(Boolean),
        items: (v.items || []).map((it: any) => ({ courseId: it.courseId, qty: it.qty, unitPrice: it.unitPrice })),
      }).catch(() => null); // 失败提示已由请求层统一弹出
      if (res) setCalcRes(res);
    } finally { setCalcSubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={TYPE_LABELS[v]?.color}>{TYPE_LABELS[v]?.label}</Tag> },
    { title: '面额/规则', render: (_: any, r: any) => {
      if (r.type === 'DISCOUNT') return `${r.value}% off`;
      if (r.type === 'AMOUNT') return `¥${r.value}`;
      if (r.type === 'FLASH') return `特价¥${r.value}`;
      if (r.type === 'FULL_REDUCTION') return (r.tiers || []).map((t: any) => `满${t.threshold}减${t.minus}`).join(' / ') || `满${r.minSpend}减${r.value}`;
      if (r.type === 'GIFT') return `买${r.giftRule?.buyQty}赠${r.giftRule?.giftQty}`;
      if (r.type === 'FREE_CLASS') return `${r.value}课时`;
      return '-';
    } },
    { title: '门槛', dataIndex: 'minSpend', render: (v: number) => (v ? `满¥${v}` : '无') },
    { title: '活动', dataIndex: 'autoApply', width: 70, render: (v: number) => v ? <Tag color="orange">全场</Tag> : <Tag>券</Tag> },
    { title: '叠加', dataIndex: 'stackable', width: 70, render: (v: number, r: any) => v ? <Tag color="green">可叠{`${r.maxStack || 3}`}</Tag> : <Tag color="red">互斥</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 180, render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(r); setType(r.type); form.setFieldsValue(r); setOpen(true); }}>编辑</Button>
          <Button type="link" size="small" icon={<GiftOutlined />} onClick={() => openGrant(r)}>发放</Button>
          <Popconfirm title="确认删除该模板？" okText="删除" cancelText="取消" onConfirm={async () => { await deleteCouponTemplate(r.id); message.success('已删除'); load(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  const grantColumns = useMemo(() => [
    { title: '券码', dataIndex: 'code' },
    { title: '学员', dataIndex: 'studentId' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'UNUSED' ? 'green' : v === 'USED' ? 'red' : 'default'}>{v}</Tag> },
    { title: '到期', dataIndex: 'expireAt', render: (v: string) => v || '-' },
  ], []);

  const courseOpts = useMemo(() => courses.map((c) => ({ value: c.id, label: c.name })), [courses]);
  const cgOpts = useMemo(() => classGroups.map((c) => ({ value: c.id, label: c.name })), [classGroups]);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建促销/券模板</Button>
        <Button icon={<CalculatorOutlined />} loading={calcSubmitting} onClick={() => { calcForm.resetFields(); setCalcRes(null); setCalcOpen(true); }}>促销试算</Button>
      </Space>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
        pagination={{ current: page, pageSize: size, total, showSizeChanger: true }}
        onChange={(p, s) => load(p.current, p.pageSize || size)} />

      <Modal title={editing ? '编辑促销/券模板' : '新建促销/券模板'} open={open} width={720}
        confirmLoading={submitting} onOk={submitTemplate} onCancel={() => setOpen(false)} okText="保存" cancelText="取消">
        <Form form={form} layout="vertical">
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} onChange={(v) => setType(v)} options={Object.entries(TYPE_LABELS).map(([v, m]) => ({ value: v, label: m.label }))} />
            </Form.Item>
            {type !== 'FULL_REDUCTION' && type !== 'GIFT' && (
              <Form.Item name="value" label={type === 'FLASH' ? '特价单价(元)' : '面额/折扣值(AMOUNT=元, DISCOUNT=%, FREE_CLASS=课时)'}>
                <InputNumber style={{ width: 220 }} min={0} />
              </Form.Item>
            )}
          </Space>

          {type === 'FULL_REDUCTION' && (
            <Form.Item label="满减阶梯（按最高命中档位减免）">
              <Form.List name="tiers">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((f) => (
                      <Space key={f.key} align="baseline">
                        <Form.Item {...f} name={[f.name, 'threshold']} rules={[{ required: true, message: '门槛' }]}><InputNumber placeholder="满" min={0} /></Form.Item>
                        <Form.Item {...f} name={[f.name, 'minus']} rules={[{ required: true, message: '减' }]}><InputNumber placeholder="减" min={0} /></Form.Item>
                        <Button type="link" danger onClick={() => remove(f.name)}>删</Button>
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block>加一档</Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}

          {type === 'GIFT' && (
            <Space size="large" style={{ display: 'flex' }}>
              <Form.Item name={['giftRule', 'buyQty']} label="买满数量" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
              <Form.Item name={['giftRule', 'giftQty']} label="赠送数量" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
              <Form.Item name={['giftRule', 'giftCourseId']} label="赠品课程" rules={[{ required: true }]}>
                <Select style={{ width: 180 }} options={courseOpts} showSearch optionFilterProp="label" />
              </Form.Item>
              <Form.Item name={['giftRule', 'giftName']} label="赠品名称"><Input /></Form.Item>
            </Space>
          )}

          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="minSpend" label="使用门槛(元)"><InputNumber min={0} /></Form.Item>
            <Form.Item name="totalQty" label="总发放量(空=不限)"><InputNumber min={0} /></Form.Item>
            <Form.Item name="perLimit" label="每人限领"><InputNumber min={1} /></Form.Item>
            <Form.Item name="validDays" label="领取后有效天数"><InputNumber min={0} /></Form.Item>
          </Space>

          <Divider orientation="left">适用限制</Divider>
          <Space size="large" style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item name="applicableCourseIds" label="适用课程(空=全部)">
              <Select mode="multiple" style={{ width: 220 }} options={courseOpts} showSearch optionFilterProp="label" allowClear />
            </Form.Item>
            <Form.Item name="applicableClassGroupIds" label="适用班级(空=全部)">
              <Select mode="multiple" style={{ width: 220 }} options={cgOpts} showSearch optionFilterProp="label" allowClear />
            </Form.Item>
            <Form.Item name="applicableStudentTags" label="适用人群标签(空=全部)">
              <Select mode="multiple" style={{ width: 220 }} options={TAG_OPTIONS} tokenSeparators={[',']} allowClear />
            </Form.Item>
          </Space>

          <Divider orientation="left">叠加与投放</Divider>
          <Space size="large" style={{ display: 'flex', flexWrap: 'wrap' }} align="center">
            <Form.Item name="autoApply" label="全场自动活动(下单自动叠加)" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="stackable" label="可叠加(关=互斥独占)" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="stackGroup" label="互斥组(同组仅生效最优)"><Input placeholder="如 DISCOUNT_GROUP" /></Form.Item>
            <Form.Item name="maxStack" label="单笔最多叠加数"><InputNumber min={1} max={5} /></Form.Item>
            <Form.Item name="priority" label="叠加优先级"><InputNumber min={0} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} /></Form.Item>
          </Space>
        </Form>
      </Modal>

      <Drawer title={`发放记录 - ${grantTpl?.name || ''}`} open={grantOpen} onClose={() => setGrantOpen(false)} width={520}>
        <Form form={grantForm} layout="vertical" style={{ marginBottom: 12 }}>
          <Space align="end">
            <Form.Item name="templateId" hidden><InputNumber /></Form.Item>
            <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '必填' }]}><InputNumber min={1} /></Form.Item>
            <Form.Item name="count" label="数量"><InputNumber min={1} max={50} /></Form.Item>
            <Button type="primary" loading={grantSubmitting} onClick={submitGrant}>发放</Button>
          </Space>
        </Form>
        <Table rowKey="id" size="small" dataSource={grants} columns={grantColumns} />
      </Drawer>

      <Drawer title="促销试算引擎" open={calcOpen} onClose={() => setCalcOpen(false)} width={560}>
        <Form form={calcForm} layout="vertical">
          <Form.Item name="amount" label="订单总额(元，无明细时必填)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="订单明细（用于限时特价/买赠按课程匹配）">
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((f) => (
                    <Space key={f.key} align="baseline">
                      <Form.Item {...f} name={[f.name, 'courseId']} rules={[{ required: true }]}><Select style={{ width: 140 }} placeholder="课程" options={courseOpts} showSearch optionFilterProp="label" /></Form.Item>
                      <Form.Item {...f} name={[f.name, 'qty']} rules={[{ required: true }]}><InputNumber placeholder="数量" min={1} /></Form.Item>
                      <Form.Item {...f} name={[f.name, 'unitPrice']} rules={[{ required: true }]}><InputNumber placeholder="单价" min={0} /></Form.Item>
                      <Button type="link" danger onClick={() => remove(f.name)}>删</Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>加明细</Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="studentTags" label="学员人群标签"><Select mode="multiple" style={{ width: '100%' }} options={TAG_OPTIONS} allowClear /></Form.Item>
          <Form.Item name="codes" label="券码(逗号分隔)"><Input.TextArea rows={2} placeholder="CP1000001... 留空仅试算全场活动" /></Form.Item>
          <Button type="primary" loading={calcSubmitting} onClick={doCalc}>试算</Button>
        </Form>
        {calcRes && (
          <Card size="small" style={{ marginTop: 12 }} title={`总减免 ¥${calcRes.totalDiscount}`}>
            <p>命中优惠：</p>
            {(calcRes.applied || []).map((a: any, i: number) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <Tag color={TYPE_LABELS[a.type]?.color}>{TYPE_LABELS[a.type]?.label}</Tag>
                {a.name} {a.discount ? `-¥${a.discount}` : ''}
                {a.giftItems?.map((g: any, j: number) => <Tag key={j} color="magenta">赠课#{g.courseId}×{g.qty}</Tag>)}
              </div>
            ))}
            {(calcRes.giftItems || []).length > 0 && <p>赠品合计：{(calcRes.giftItems || []).map((g: any) => `课程${g.courseId}×${g.qty}`).join('，')}</p>}
          </Card>
        )}
      </Drawer>
    </div>
  );
}
