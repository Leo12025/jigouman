import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, List, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import {
  listCoursePackages, createCoursePackage, updateCoursePackage, deleteCoursePackage,
  listPackageCourses, addPackageCourses, removePackageCourse, purchaseCoursePackage, listCourses,
  listPackageTiers, setPackageTiers, listPackageItems, setPackageItems,
  listPackagePriceRules, setPackagePriceRules,
} from '../api/crm';
import { withComplianceConfirm } from '../api/client';

const SELL_TYPE_OPTIONS = [
  { value: 'SINGLE', label: '单次课/体验课' },
  { value: 'HOUR_PACK', label: '课时包' },
  { value: 'COMBO', label: '组合套餐' },
  { value: 'PERIOD_COURSE', label: '期课' },
  { value: 'TIME_CARD', label: '时间卡/年卡' },
  { value: 'DEPOSIT', label: '定金' },
];
const CONSUME_MODE_OPTIONS = [
  { value: 'BY_HOUR', label: '按课时（扣课时）' },
  { value: 'BY_TIME', label: '按时间（有效期内不限次）' },
  { value: 'BY_PERIOD', label: '按期（绑定班期）' },
];
const SCOPE_OPTIONS = [
  { value: 'ALL_COURSE', label: '通用包（跨课程共用课时池）' },
  { value: 'SPECIFIED_COURSE', label: '限定课程' },
];
const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: '不限' },
  { value: 'NEW', label: '仅新签' },
  { value: 'RETURNING', label: '仅老生续费专享' },
];
const DIMENSION_OPTIONS = [
  { value: 'CAMPUS', label: '校区' },
  { value: 'TEACHER_LEVEL', label: '老师级别' },
  { value: 'CLASS_TYPE', label: '班型' },
  { value: 'AUDIENCE', label: '人群' },
];

const labelOf = (opts: { value: string; label: string }[], v?: string) =>
  opts.find((o) => o.value === v)?.label ?? v ?? '-';

export default function CoursePackagePage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
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
  const [tiers, setTiers] = useState<any[]>([]);

  // 阶梯规格 / 组合子项 / 差异定价
  const [tierOpen, setTierOpen] = useState(false);
  const [tierList, setTierList] = useState<any[]>([]);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemList, setItemList] = useState<any[]>([]);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleList, setRuleList] = useState<any[]>([]);

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
      .then((r: any) => {
        const list = r.list || [];
        setCourseOptions(list.map((c: any) => ({ value: c.id, label: c.name })));
      })
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1, totalHours: 0, price: 0,
      sellType: 'HOUR_PACK', consumeMode: 'BY_HOUR',
      scopeType: 'SPECIFIED_COURSE', audience: 'ALL',
    });
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
      // 合规二次确认：超课时/金额/时长上限时弹窗，确认后自动重发
      if (editing) await withComplianceConfirm((extra) => updateCoursePackage(editing.id, { ...v, ...extra }));
      else await withComplianceConfirm((extra) => createCoursePackage({ ...v, ...extra }));
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

  // ---------- 阶梯规格 ----------
  const openTiers = async (r: any) => {
    setCurPkg(r);
    const list = await listPackageTiers(r.id).catch(() => []);
    setTierList(list || []);
    setTierOpen(true);
  };
  const saveTiers = async () => {
    const tiers = tierList.filter((t) => t.hours > 0 && t.price >= 0).map((t, i) => ({ ...t, sort: i }));
    await withComplianceConfirm((extra) => setPackageTiers(curPkg.id, tiers as any, extra));
    message.success('阶梯规格已保存');
    setTierOpen(false);
  };

  // ---------- 组合套餐子项 ----------
  const openItems = async (r: any) => {
    setCurPkg(r);
    const list = await listPackageItems(r.id).catch(() => []);
    setItemList(list || []);
    setItemOpen(true);
  };
  const saveItems = async () => {
    const items = itemList.filter((i) => i.courseId);
    await withComplianceConfirm((extra) => setPackageItems(curPkg.id, items as any, extra));
    message.success('组合子项已保存');
    setItemOpen(false);
  };

  // ---------- 差异化定价 ----------
  const openRules = async (r: any) => {
    setCurPkg(r);
    const list = await listPackagePriceRules(r.id).catch(() => []);
    setRuleList(list || []);
    setRuleOpen(true);
  };
  const saveRules = async () => {
    const rules = ruleList.filter((x) => x.dimension && x.dimValue);
    await setPackagePriceRules(curPkg.id, rules as any);
    message.success('差异化定价已保存');
    setRuleOpen(false);
  };

  // ---------- 购课发放 ----------
  const openBuy = async (r: any) => {
    setCurPkg(r);
    setTiers([]);
    buyForm.resetFields();
    buyForm.setFieldsValue({ hours: r.totalHours, grantType: 'PAID' });
    const t = await listPackageTiers(r.id).catch(() => []);
    setTiers(t || []);
    setBuyOpen(true);
  };
  const onBuy = async () => {
    const v = await buyForm.validateFields();
    setBuySubmitting(true);
    try {
      await withComplianceConfirm((extra) => purchaseCoursePackage(curPkg.id, { ...v, ...extra } as any));
      message.success('已发放课包课时');
      setBuyOpen(false);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setBuySubmitting(false); }
  };

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '套餐名称', dataIndex: 'name' },
    {
      title: '消耗模式', dataIndex: 'consumeMode', width: 150,
      render: (v: string) => <Tag color={v === 'BY_HOUR' ? 'blue' : v === 'BY_TIME' ? 'purple' : 'orange'}>{labelOf(CONSUME_MODE_OPTIONS, v)}</Tag>,
    },
    {
      title: '形态', dataIndex: 'sellType', width: 120,
      render: (v: string) => labelOf(SELL_TYPE_OPTIONS, v),
    },
    {
      title: '人群', dataIndex: 'audience', width: 110,
      render: (v: string) => (v && v !== 'ALL'
        ? <Tag color="gold">{labelOf(AUDIENCE_OPTIONS, v)}</Tag>
        : <span>不限</span>),
    },
    { title: '总课时', dataIndex: 'totalHours', width: 90 },
    { title: '有效期(天)', dataIndex: 'validDays', width: 100, render: (v: number) => v ?? '-' },
    { title: '售价', dataIndex: 'price', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: number) => <Tag color={s === 1 ? 'green' : 'default'}>{s === 1 ? '上架' : '下架'}</Tag>,
    },
    {
      title: '操作',
      render: (_: any, r: any) => (
        <Space wrap>
          <Button size="small" onClick={() => openCourses(r)}>关联课程</Button>
          {r.sellType === 'COMBO'
            ? <Button size="small" onClick={() => openItems(r)}>组合子项</Button>
            : <Button size="small" onClick={() => openTiers(r)}>阶梯规格</Button>}
          <Button size="small" onClick={() => openRules(r)}>差异定价</Button>
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
        scroll={{ x: 'max-content' }}
      />

      {/* 新建 / 编辑 */}
      <Modal
        title={editing ? `编辑课包 #${editing.id}` : '新建课包'}
        open={editOpen} confirmLoading={editSubmitting} onOk={onSubmit}
        onCancel={() => setEditOpen(false)} okText="保存" width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套餐名称" rules={[{ required: true, message: '请输入套餐名称' }]}>
            <Input placeholder="如：C++ 信奥 60 课时包" />
          </Form.Item>
          <Form.Item name="code" label="套餐编码">
            <Input placeholder="对外展示/对接用，可留空" />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="sellType" label="售卖形态">
              <Select style={{ width: 200 }} options={SELL_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="consumeMode" label="消耗模式" tooltip="决定发放到课时账户 / 时间权益 / 班期报名">
              <Select style={{ width: 240 }} options={CONSUME_MODE_OPTIONS} />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="scopeType" label="适用范围" tooltip="通用包：跨课程共用课时池；限定包：仅指定课程">
              <Select style={{ width: 240 }} options={SCOPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="audience" label="适用人群" tooltip="老生 = 存在有效订单（已支付/已完成）的学员">
              <Select style={{ width: 200 }} options={AUDIENCE_OPTIONS} />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="totalHours" label="总课时" rules={[{ required: true, message: '请输入总课时' }]}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="validDays" label="有效期(天)">
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="classGroupId" label="绑定班期(期课)">
              <InputNumber min={0} style={{ width: 140 }} placeholder="BY_PERIOD 时填" />
            </Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="listPrice" label="标价(划线价)">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select style={{ width: 120 }} options={[{ value: 1, label: '上架' }, { value: 0, label: '下架' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 关联课程 */}
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
            size="small" bordered dataSource={pkgCourses}
            locale={{ emptyText: '暂未关联课程' }}
            renderItem={(c: any) => (
              <List.Item actions={[
                <Button key="rm" size="small" danger onClick={() => onRemoveCourse(c.courseId)}>移除</Button>,
              ]}
              >
                {c.name || `课程#${c.courseId}`}
              </List.Item>
            )}
          />
        </Space>
      </Modal>

      {/* 阶梯规格 */}
      <Modal
        title={`阶梯规格「${curPkg?.name ?? ''}」`}
        open={tierOpen} onOk={saveTiers} onCancel={() => setTierOpen(false)} okText="保存" width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            size="small"
            onClick={() => setTierList((l) => [...l, { hours: 0, price: 0 }])}
          >
            新增档位
          </Button>
          {tierList.map((t, i) => (
            <Space key={i}>
              <InputNumber
                addonAfter="课时" min={1} style={{ width: 150 }}
                value={t.hours} onChange={(v) => setTierList((l) => l.map((x, j) => (j === i ? { ...x, hours: Number(v) || 0 } : x)))}
              />
              <InputNumber
                addonBefore="¥" min={0} style={{ width: 150 }}
                value={t.price} onChange={(v) => setTierList((l) => l.map((x, j) => (j === i ? { ...x, price: Number(v) || 0 } : x)))}
              />
              <Button size="small" danger onClick={() => setTierList((l) => l.filter((_, j) => j !== i))}>删除</Button>
            </Space>
          ))}
          {!tierList.length && <span style={{ color: '#888' }}>暂无阶梯档位（建议 2~3 档，档间价差 15%~25%）</span>}
        </Space>
      </Modal>

      {/* 组合套餐子项 */}
      <Modal
        title={`组合子项「${curPkg?.name ?? ''}」`}
        open={itemOpen} onOk={saveItems} onCancel={() => setItemOpen(false)} okText="保存" width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#888' }}>组合套餐每个子项需指定各自固定课时，用完不能挪用其他科目的课时。</div>
          <Button size="small" onClick={() => setItemList((l) => [...l, { courseId: undefined, hours: 0 }])}>
            新增子项
          </Button>
          {itemList.map((it, i) => (
            <Space key={i}>
              <Select
                style={{ width: 200 }} placeholder="选择课程"
                value={it.courseId} onChange={(v) => setItemList((l) => l.map((x, j) => (j === i ? { ...x, courseId: v } : x)))}
                options={courseOptions}
              />
              <InputNumber
                addonAfter="课时" min={1} style={{ width: 150 }}
                value={it.hours} onChange={(v) => setItemList((l) => l.map((x, j) => (j === i ? { ...x, hours: Number(v) || 0 } : x)))}
              />
              <Button size="small" danger onClick={() => setItemList((l) => l.filter((_, j) => j !== i))}>删除</Button>
            </Space>
          ))}
          {!itemList.length && <span style={{ color: '#888' }}>暂无子项</span>}
        </Space>
      </Modal>

      {/* 差异化定价 */}
      <Modal
        title={`差异定价「${curPkg?.name ?? ''}」`}
        open={ruleOpen} onOk={saveRules} onCancel={() => setRuleOpen(false)} okText="保存" width={680}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#888' }}>按校区 / 老师级别 / 班型 / 人群设置不同售价；人群维度可实现「老生续费立减」。</div>
          <Button size="small" onClick={() => setRuleList((l) => [...l, { dimension: 'CAMPUS', dimValue: '', price: 0 }])}>
            新增规则
          </Button>
          {ruleList.map((r, i) => (
            <Space key={i}>
              <Select
                style={{ width: 130 }} value={r.dimension}
                onChange={(v) => setRuleList((l) => l.map((x, j) => (j === i ? { ...x, dimension: v } : x)))}
                options={DIMENSION_OPTIONS}
              />
              <Input
                style={{ width: 130 }} placeholder="维度值" value={r.dimValue}
                onChange={(e) => setRuleList((l) => l.map((x, j) => (j === i ? { ...x, dimValue: e.target.value } : x)))}
              />
              <InputNumber
                addonBefore="¥" min={0} style={{ width: 140 }} value={r.price}
                onChange={(v) => setRuleList((l) => l.map((x, j) => (j === i ? { ...x, price: Number(v) || 0 } : x)))}
              />
              <Button size="small" danger onClick={() => setRuleList((l) => l.filter((_, j) => j !== i))}>删除</Button>
            </Space>
          ))}
          {!ruleList.length && <span style={{ color: '#888' }}>暂无定价规则（未命中时使用套餐售价）</span>}
        </Space>
      </Modal>

      {/* 购课发放 */}
      <Modal
        title={`购课发放「${curPkg?.name ?? ''}」`}
        open={buyOpen} confirmLoading={buySubmitting} onOk={onBuy}
        onCancel={() => setBuyOpen(false)} okText="发放"
      >
        <Form form={buyForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '请输入学员ID' }]}>
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          {tiers.length > 0 && (
            <Form.Item name="tierId" label="阶梯档位" tooltip="选择档位后按档位课时与价格发放">
              <Select
                allowClear
                options={tiers.map((t: any) => ({ value: t.id, label: `${t.hours} 课时 / ¥${t.price}` }))}
              />
            </Form.Item>
          )}
          <Form.Item name="hours" label="发放课时(默认套餐总课时)">
            <InputNumber min={1} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="grantType" label="发放性质" tooltip="赠课会独立成户：优先消耗，退费时不计入可退金额">
            <Select options={[{ value: 'PAID', label: '付费购买' }, { value: 'GIFT', label: '赠送' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
