import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table, Tabs, Button, Space, Modal, Form, Input, InputNumber, Select, Popconfirm, Tag, App, Descriptions, Drawer, Divider,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listGroupBuyActivities, createGroupBuyActivity, updateGroupBuyActivity, deleteGroupBuyActivity,
  createTeam, joinTeam, listTeams, redeemGroupBuy,
  listGroupBuyTiers, setGroupBuyTiers, listOpenTeams, listTeamMembers,
  getGroupBuyFunnel, getStaffRanking, createShowoff, listShowoffs,
  createSquad, listSquads, createMarketingMaterial, listMarketingMaterials,
} from '../api/crm';
import { withComplianceConfirm } from '../api/client';

const ACT_STATUS: Record<string, string> = { ACTIVE: 'green', DISABLED: 'default' };
const TEAM_STATUS: Record<string, { color: string; text: string }> = {
  OPEN: { color: 'gold', text: '进行中' },
  SUCCESS: { color: 'green', text: '已成团' },
  REDEEMED: { color: 'blue', text: '已核销' },
  INVALID: { color: 'red', text: '已失效' },
};
const JOIN_RULE_OPTIONS = [
  { value: 'ALL', label: '不限' },
  { value: 'NEW_ONLY', label: '仅新学员可参团（老客只能开团）' },
];
const MATERIAL_TYPE_OPTIONS = [
  { value: 'POSTER', label: '海报' },
  { value: 'FLYER', label: '传单' },
  { value: 'ARTICLE', label: '图文' },
  { value: 'INVITE', label: '邀请函' },
];

export default function GroupBuyPage() {
  const { message } = App.useApp();

  // ---------- 活动 ----------
  const [acts, setActs] = useState<any[]>([]);
  const [actOpen, setActOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [actForm] = Form.useForm();
  const [actSubmitting, setActSubmitting] = useState(false);

  // 阶梯团
  const [tierOpen, setTierOpen] = useState(false);
  const [tierAct, setTierAct] = useState<any>(null);
  const [tierList, setTierList] = useState<any[]>([]);

  // 凑团
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinForm] = Form.useForm();
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  // 开团
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamAct, setTeamAct] = useState<any>(null);
  const [teamForm] = Form.useForm();
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  // 拼团实例
  const [teams, setTeams] = useState<any[]>([]);
  const [teamActId, setTeamActId] = useState<number | undefined>();
  const [memberOpen, setMemberOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  // 数据
  const [funnel, setFunnel] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [openTeams, setOpenTeams] = useState<any[]>([]);

  // 晒单 / 战队 / 物料
  const [showoffs, setShowoffs] = useState<any[]>([]);
  const [showoffForm] = Form.useForm();
  const [showoffModal, setShowoffModal] = useState(false);
  const [squads, setSquads] = useState<any[]>([]);
  const [squadForm] = Form.useForm();
  const [squadModal, setSquadModal] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialForm] = Form.useForm();
  const [materialModal, setMaterialModal] = useState(false);

  const loadActs = useCallback(async () => {
    const r: any = await listGroupBuyActivities({ page: 1, size: 50 }).catch(() => ({ list: [], total: 0 }));
    setActs(r.list || []);
  }, []);
  useEffect(() => { loadActs(); }, [loadActs]);

  const loadTeams = useCallback(async (activityId?: number) => {
    if (!activityId) { setTeams([]); return; }
    setTeams((await listTeams(activityId).catch(() => [])) || []);
  }, []);

  const loadExtras = useCallback(async () => {
    setShowoffs((await listShowoffs().catch(() => [])) || []);
    setSquads((await listSquads().catch(() => [])) || []);
    setMaterials((await listMarketingMaterials().catch(() => [])) || []);
  }, []);
  useEffect(() => { loadExtras(); }, [loadExtras]);

  // ---------- 活动提交 ----------
  const submitAct = async () => {
    const v = await actForm.validateFields();
    setActSubmitting(true);
    try {
      // 合规二次确认：拼团价/发放课时超预收费上限时弹窗，确认后继续
      if (editing) await withComplianceConfirm((extra) => updateGroupBuyActivity(editing.id, { ...v, ...extra }));
      else await withComplianceConfirm((extra) => createGroupBuyActivity({ ...v, ...extra }));
      message.success('已保存');
      setActOpen(false);
      loadActs();
    } catch { /* 失败提示由请求层统一处理 */ } finally { setActSubmitting(false); }
  };

  const openCreate = () => {
    setEditing(null);
    actForm.resetFields();
    actForm.setFieldsValue({
      price: 0, groupSize: 2, hours: 0, status: 'ACTIVE',
      teamValidHours: 24, autoFill: false, joinRule: 'ALL',
      commissionRate1: 0, commissionRate2: 0,
    });
    setActOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    actForm.resetFields();
    actForm.setFieldsValue(r);
    setActOpen(true);
  };

  // ---------- 阶梯团 ----------
  const openTiers = async (r: any) => {
    setTierAct(r);
    setTierList((await listGroupBuyTiers(r.id).catch(() => [])) || []);
    setTierOpen(true);
  };
  const saveTiers = async () => {
    const tiers = tierList.filter((t) => t.minSize > 0 && t.price >= 0).map((t, i) => ({ ...t, sort: i }));
    await withComplianceConfirm((extra) => setGroupBuyTiers(tierAct.id, tiers, extra));
    message.success('阶梯档位已保存');
    setTierOpen(false);
  };

  // ---------- 凑团 ----------
  const openJoin = async (r: any) => {
    setTeamAct(r);
    joinForm.resetFields();
    setOpenTeams((await listOpenTeams(r.id, 10).catch(() => [])) || []);
    setJoinOpen(true);
  };
  const submitJoin = async () => {
    const v = await joinForm.validateFields();
    setJoinSubmitting(true);
    try {
      await withComplianceConfirm((extra) => joinTeam({ ...v, ...extra }));
      message.success('已参团，请完成订单支付');
      setJoinOpen(false);
      loadTeams(teamActId);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setJoinSubmitting(false); }
  };

  // ---------- 开团 ----------
  const openTeamModal = (r: any) => {
    setTeamAct(r);
    teamForm.resetFields();
    setTeamOpen(true);
  };
  const submitTeam = async () => {
    const v = await teamForm.validateFields();
    setTeamSubmitting(true);
    try {
      await withComplianceConfirm((extra) => createTeam({ ...v, activityId: teamAct.id, ...extra }));
      message.success('已开团，请完成订单支付');
      setTeamOpen(false);
      loadTeams(teamActId);
    } catch { /* 失败提示由请求层统一处理 */ } finally { setTeamSubmitting(false); }
  };

  // ---------- 核销 / 成员 ----------
  const onRedeem = async (r: any) => {
    await redeemGroupBuy(r.code).catch(() => undefined);
    message.success('已核销');
    loadTeams(teamActId);
  };
  const viewMembers = async (teamId: number) => {
    setMembers((await listTeamMembers(teamId).catch(() => [])) || []);
    setMemberOpen(true);
  };

  // ---------- 漏斗 / 员工榜 ----------
  const viewFunnel = async (r: any) => {
    setFunnel(await getGroupBuyFunnel(r.id).catch(() => null));
    setRanking((await getStaffRanking(r.id).catch(() => [])) || []);
  };

  // ---------- 列定义 ----------
  const actCols = useMemo(() => [
    { title: '活动名', dataIndex: 'name' },
    { title: '团购价', dataIndex: 'price', render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    { title: '成团人数', dataIndex: 'groupSize' },
    { title: '发放课时', dataIndex: 'hours', render: (v: number) => v ?? '-' },
    {
      title: '团长优惠', dataIndex: 'leaderPrice',
      render: (v: number) => (v != null ? <Tag color="gold">¥{Number(v).toFixed(2)}</Tag> : '-'),
    },
    {
      title: '团有效期', dataIndex: 'teamValidHours',
      render: (v: number) => (v ? `${v}h` : '-'),
    },
    {
      title: '规则', width: 180,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          {r.joinRule === 'NEW_ONLY' && <Tag color="blue">仅新客参团</Tag>}
          {r.autoFill ? <Tag color="cyan">模拟成团</Tag> : null}
          {Number(r.commissionRate1) > 0 && <Tag color="purple">分销 {(Number(r.commissionRate1) * 100).toFixed(0)}%</Tag>}
        </Space>
      ),
    },
    {
      title: '状态', dataIndex: 'status',
      render: (v: string) => <Tag color={ACT_STATUS[v] || 'default'}>{v === 'ACTIVE' ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作', width: 280,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => openTeamModal(r)}>开团</Button>
          <Button type="link" size="small" onClick={() => openJoin(r)}>参团</Button>
          <Button type="link" size="small" onClick={() => openTiers(r)}>阶梯</Button>
          <Button type="link" size="small" onClick={() => viewFunnel(r)}>数据</Button>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm
            title="删除该活动？" okText="删除" cancelText="取消"
            onConfirm={async () => { await deleteGroupBuyActivity(r.id); message.success('已删除'); loadActs(); }}
          >
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [message, loadActs, loadTeams, teamActId]);

  const teamCols = useMemo(() => [
    { title: '拼团码', dataIndex: 'code' },
    { title: '团长学员', dataIndex: 'leaderStudentId' },
    { title: '当前人数', dataIndex: 'currentSize' },
    {
      title: '状态', dataIndex: 'status',
      render: (v: string) => <Tag color={TEAM_STATUS[v]?.color || 'default'}>{TEAM_STATUS[v]?.text || v}</Tag>,
    },
    {
      title: '有效期至', dataIndex: 'expireAt',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '核销', width: 120,
      render: (_: any, r: any) => (r.status === 'REDEEMED'
        ? <span style={{ color: '#888' }}>{r.redeemedAt ? new Date(r.redeemedAt).toLocaleString() : '已核销'}</span>
        : <span>-</span>),
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => viewMembers(r.id)}>成员</Button>
          <Button
            type="link" size="small"
            disabled={r.status !== 'SUCCESS'}
            onClick={() => onRedeem(r)}
          >
            核销
          </Button>
        </Space>
      ),
    },
  ], [message, loadTeams, teamActId]);

  return (
    <PageContainer title="团购拼团">
      <Tabs
        items={[
          {
            key: 'act', label: '拼团活动',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button icon={<ReloadOutlined />} onClick={loadActs}>刷新</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建活动</Button>
                </Space>
                <Table rowKey="id" size="small" dataSource={acts} columns={actCols} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />

                {funnel && (
                  <>
                    <Divider orientation="left">活动漏斗</Divider>
                    <Descriptions size="small" bordered column={4}>
                      <Descriptions.Item label="访问">{funnel.view}</Descriptions.Item>
                      <Descriptions.Item label="分享">{funnel.share}</Descriptions.Item>
                      <Descriptions.Item label="参团">{funnel.join}</Descriptions.Item>
                      <Descriptions.Item label="成团">{funnel.teamSuccess}</Descriptions.Item>
                      <Descriptions.Item label="核销">{funnel.redeem}</Descriptions.Item>
                      <Descriptions.Item label="访问→参团">{funnel.rates?.viewToJoin}%</Descriptions.Item>
                      <Descriptions.Item label="参团→成团">{funnel.rates?.joinToSuccess}%</Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                      行业基准：点击→报名转化率 1%~2%（新东方案例 82 万点击 / 1.09 万报名）
                    </div>
                  </>
                )}

                {ranking.length > 0 && (
                  <>
                    <Divider orientation="left">员工榜</Divider>
                    <Table
                      rowKey="staffId" size="small" pagination={false}
                      dataSource={ranking}
                      columns={[
                        { title: '排名', render: (_: any, __: any, i: number) => i + 1 },
                        { title: '员工ID', dataIndex: 'staffId' },
                        { title: '战队', dataIndex: 'squad', render: (v: string) => v || '-' },
                        { title: '成团数', dataIndex: 'teams' },
                        { title: '参团/开团数', dataIndex: 'joins' },
                      ]}
                    />
                  </>
                )}
              </>
            ),
          },
          {
            key: 'team', label: '拼团实例',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <span>活动：</span>
                  <Select
                    style={{ width: 240 }} placeholder="选择活动查看拼团"
                    value={teamActId}
                    onChange={(id) => { setTeamActId(id); loadTeams(id); }}
                    options={acts.map((a) => ({ value: a.id, label: a.name }))}
                  />
                  <Button icon={<ReloadOutlined />} onClick={() => loadTeams(teamActId)}>刷新</Button>
                </Space>
                <Table rowKey="id" size="small" dataSource={teams} columns={teamCols} pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} />
              </>
            ),
          },
          {
            key: 'showoff', label: '晒单',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { showoffForm.resetFields(); setShowoffModal(true); }}>
                    发布晒单
                  </Button>
                </Space>
                <Table
                  rowKey="id" size="small" dataSource={showoffs}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '活动', dataIndex: 'activityId' },
                    { title: '拼团', dataIndex: 'teamId' },
                    { title: '学员', dataIndex: 'studentId' },
                    { title: '内容', dataIndex: 'content', render: (v: string) => v || '-' },
                    {
                      title: '状态', dataIndex: 'status',
                      render: (v: string) => <Tag color={v === 'APPROVED' ? 'green' : 'default'}>{v}</Tag>,
                    },
                  ]}
                  pagination={{ pageSize: 20 }}
                />
              </>
            ),
          },
          {
            key: 'squad', label: '战队',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { squadForm.resetFields(); setSquadModal(true); }}>
                    新建战队
                  </Button>
                </Space>
                <Table
                  rowKey="id" size="small" dataSource={squads}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '战队名', dataIndex: 'name' },
                    { title: '活动', dataIndex: 'activityId', render: (v: number) => v || '机构级' },
                    { title: '成员数', render: (_: any, r: any) => (r.staffIds ? String(r.staffIds).split(',').length : 0) },
                    {
                      title: '状态', dataIndex: 'status',
                      render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag>,
                    },
                  ]}
                  pagination={{ pageSize: 20 }}
                />
              </>
            ),
          },
          {
            key: 'material', label: '营销物料',
            children: (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { materialForm.resetFields(); setMaterialModal(true); }}>
                    新增物料
                  </Button>
                </Space>
                <Table
                  rowKey="id" size="small" dataSource={materials}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '名称', dataIndex: 'name' },
                    {
                      title: '类型', dataIndex: 'type',
                      render: (v: string) => MATERIAL_TYPE_OPTIONS.find((o) => o.value === v)?.label || v,
                    },
                    { title: '场景', dataIndex: 'scene', render: (v: string) => v || '-' },
                    {
                      title: '可打印', dataIndex: 'printable',
                      render: (b: boolean) => (b ? <Tag color="blue">是</Tag> : '-'),
                    },
                  ]}
                  pagination={{ pageSize: 20 }}
                />
              </>
            ),
          },
        ]}
      />

      {/* 活动编辑 */}
      <Modal
        title={editing ? '编辑活动' : '新建拼团活动'}
        open={actOpen} confirmLoading={actSubmitting}
        onOk={submitAct} onCancel={() => setActOpen(false)} okText="保存" cancelText="取消" width={680}
      >
        <Form form={actForm} layout="vertical">
          <Form.Item name="name" label="活动名" rules={[{ required: true, message: '必填' }]}><Input /></Form.Item>
          <Space size="large" wrap>
            <Form.Item name="courseId" label="课程ID"><InputNumber min={1} /></Form.Item>
            <Form.Item name="packageId" label="课包ID" tooltip="填写后按课包 consume_mode 发放"><InputNumber min={1} /></Form.Item>
            <Form.Item name="hours" label="发放课时"><InputNumber min={0} /></Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="price" label="团购价" rules={[{ required: true }]}><InputNumber min={0} addonBefore="¥" /></Form.Item>
            <Form.Item name="leaderPrice" label="团长优惠价" tooltip="团长专属价，提高开团意愿"><InputNumber min={0} addonBefore="¥" /></Form.Item>
            <Form.Item name="groupSize" label="成团人数" rules={[{ required: true }]}><InputNumber min={2} /></Form.Item>
          </Space>
          <Space size="large" wrap>
            <Form.Item name="teamValidHours" label="团有效期(小时)" tooltip="开团后须在此时间内邀满，过期失效"><InputNumber min={1} /></Form.Item>
            <Form.Item name="startTime" label="活动开始"><Input placeholder="2026-10-01T00:00:00" /></Form.Item>
            <Form.Item name="endTime" label="活动结束"><Input placeholder="2026-10-31T23:59:59" /></Form.Item>
          </Space>
          <Form.Item name="joinRule" label="新老客限制" tooltip="老客 = 存在有效订单的学员">
            <Select options={JOIN_RULE_OPTIONS} />
          </Form.Item>
          <Space size="large" wrap>
            <Form.Item name="autoFill" label="模拟成团" tooltip="到期未成团时系统自动补足，保成团率">
              <Select options={[{ value: false, label: '关闭' }, { value: true, label: '开启' }]} />
            </Form.Item>
            <Form.Item name="commissionRate1" label="一级佣金比例" tooltip="0.15 = 15%"><InputNumber min={0} max={1} step={0.01} /></Form.Item>
            <Form.Item name="commissionRate2" label="二级佣金比例"><InputNumber min={0} max={1} step={0.01} /></Form.Item>
          </Space>
          <Form.Item name="ownerId" label="活动负责人ID" tooltip="未成团退款的兜底审批人"><InputNumber min={1} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={[{ value: 'ACTIVE', label: '启用' }, { value: 'DISABLED', label: '停用' }]} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 阶梯团 */}
      <Modal
        title={`阶梯档位「${tierAct?.name ?? ''}」`}
        open={tierOpen} onOk={saveTiers} onCancel={() => setTierOpen(false)} okText="保存" width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#888' }}>人数越多价越低；建议 3~5 档，档数太多会让客户望而却步。</div>
          <Button size="small" onClick={() => setTierList((l) => [...l, { minSize: 2, price: 0 }])}>新增档位</Button>
          {tierList.map((t, i) => (
            <Space key={i}>
              <InputNumber
                addonAfter="人" min={2} style={{ width: 150 }}
                value={t.minSize}
                onChange={(v) => setTierList((l) => l.map((x, j) => (j === i ? { ...x, minSize: Number(v) || 2 } : x)))}
              />
              <InputNumber
                addonBefore="¥" min={0} style={{ width: 150 }}
                value={t.price}
                onChange={(v) => setTierList((l) => l.map((x, j) => (j === i ? { ...x, price: Number(v) || 0 } : x)))}
              />
              <Button size="small" danger onClick={() => setTierList((l) => l.filter((_, j) => j !== i))}>删除</Button>
            </Space>
          ))}
          {!tierList.length && <span style={{ color: '#888' }}>暂无阶梯（未配置时使用团购价）</span>}
        </Space>
      </Modal>

      {/* 参团（含凑团列表） */}
      <Modal
        title={`参团「${teamAct?.name ?? ''}」`}
        open={joinOpen} confirmLoading={joinSubmitting}
        onOk={submitJoin} onCancel={() => setJoinOpen(false)} okText="参团" cancelText="取消" width={620}
      >
        <Form form={joinForm} layout="vertical">
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="code" label="拼团码" rules={[{ required: true, message: '必填' }]}>
            <Input placeholder="如 GB123456" />
          </Form.Item>
          <Form.Item name="distributorId" label="推荐分销员ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="staffId" label="归属员工ID" tooltip="用于员工榜与战队 PK 统计"><InputNumber min={1} /></Form.Item>
        </Form>
        <Divider orientation="left">凑团（还差几人，可直接参团）</Divider>
        {openTeams.length === 0
          ? <span style={{ color: '#888' }}>暂无可参与的团</span>
          : (
            <Table
              rowKey="teamId" size="small" pagination={false} dataSource={openTeams}
              columns={[
                { title: '拼团码', dataIndex: 'code' },
                { title: '团长', dataIndex: 'leaderStudentId' },
                { title: '已有人数', dataIndex: 'currentSize' },
                {
                  title: '还差', dataIndex: 'need',
                  render: (v: number) => <Tag color={v <= 1 ? 'red' : 'gold'}>{v} 人</Tag>,
                },
                {
                  title: '操作',
                  render: (_: any, r: any) => (
                    <Button size="small" type="link" onClick={() => joinForm.setFieldsValue({ code: r.code })}>
                      选这个团
                    </Button>
                  ),
                },
              ]}
            />
          )}
      </Modal>

      {/* 开团 */}
      <Modal
        title={`开团「${teamAct?.name ?? ''}」`}
        open={teamOpen} confirmLoading={teamSubmitting}
        onOk={submitTeam} onCancel={() => setTeamOpen(false)} okText="开团"
      >
        <Form form={teamForm} layout="vertical">
          <Form.Item name="leaderStudentId" label="团长学员ID" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="distributorId" label="推荐分销员ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="staffId" label="归属员工ID"><InputNumber min={1} /></Form.Item>
        </Form>
      </Modal>

      {/* 成员 */}
      <Drawer title="拼团成员" open={memberOpen} onClose={() => setMemberOpen(false)} width={640}>
        <Table
          rowKey="id" size="small" pagination={false} dataSource={members}
          columns={[
            { title: '学员', dataIndex: 'studentId' },
            { title: '团长', dataIndex: 'isLeader', render: (b: boolean) => (b ? <Tag color="gold">团长</Tag> : '-') },
            { title: '应付价', dataIndex: 'payPrice', render: (v: number) => (v != null ? `¥${Number(v).toFixed(2)}` : '-') },
            { title: '订单', dataIndex: 'orderId', render: (v: number) => (v ? `#${v}` : '-') },
            { title: '分销员', dataIndex: 'distributorId', render: (v: number) => v ?? '-' },
          ]}
        />
      </Drawer>

      {/* 晒单 */}
      <Modal
        title="发布晒单" open={showoffModal} onCancel={() => setShowoffModal(false)}
        onOk={async () => {
          const v = await showoffForm.validateFields();
          await createShowoff(v).catch(() => undefined);
          message.success('已发布');
          setShowoffModal(false);
          loadExtras();
        }}
        okText="发布"
      >
        <Form form={showoffForm} layout="vertical">
          <Form.Item name="teamId" label="拼团ID" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="studentId" label="学员ID" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
          <Form.Item name="images" label="图片URL(JSON数组)"><Input placeholder='["https://..."]' /></Form.Item>
          <Form.Item name="content" label="晒单文案"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* 战队 */}
      <Modal
        title="新建战队" open={squadModal} onCancel={() => setSquadModal(false)}
        onOk={async () => {
          const v = await squadForm.validateFields();
          await createSquad(v).catch(() => undefined);
          message.success('已创建');
          setSquadModal(false);
          loadExtras();
        }}
        okText="创建"
      >
        <Form form={squadForm} layout="vertical">
          <Form.Item name="name" label="战队名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="activityId" label="绑定活动ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="staffIds" label="成员员工ID(JSON数组)"><Input placeholder="[1,2,3]" /></Form.Item>
        </Form>
      </Modal>

      {/* 物料 */}
      <Modal
        title="新增营销物料" open={materialModal} onCancel={() => setMaterialModal(false)}
        onOk={async () => {
          const v = await materialForm.validateFields();
          await createMarketingMaterial(v).catch(() => undefined);
          message.success('已新增');
          setMaterialModal(false);
          loadExtras();
        }}
        okText="保存"
      >
        <Form form={materialForm} layout="vertical">
          <Form.Item name="name" label="物料名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Space size="large" wrap>
            <Form.Item name="type" label="类型"><Select style={{ width: 140 }} options={MATERIAL_TYPE_OPTIONS} /></Form.Item>
            <Form.Item name="scene" label="场景"><Input placeholder="如 开学季/暑期" /></Form.Item>
          </Space>
          <Form.Item name="activityId" label="绑定活动ID"><InputNumber min={1} /></Form.Item>
          <Form.Item name="coverUrl" label="成品图URL"><Input /></Form.Item>
          <Form.Item name="content" label="正文HTML"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="printable" label="可打印(线下地推)">
            <Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
