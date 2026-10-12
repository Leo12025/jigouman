import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/format';
import { Steps, Tabs, Card, Descriptions, Table, Tag, Timeline, Button, Space, Spin, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getStudentLifecycle } from '../api/crm';

const ORDER_COLOR: Record<string, string> = { PENDING: 'gold', PAID: 'green', COMPLETED: 'blue', CANCELLED: 'default', REFUNDING: 'orange', REFUNDED: 'red' };
const REFUND_COLOR: Record<string, string> = { PENDING: 'gold', APPROVED: 'blue', REJECTED: 'default', REFUNDED: 'red' };
const COMPLAINT_COLOR: Record<string, string> = { PENDING: 'gold', PROCESSING: 'orange', RESOLVED: 'green', CLOSED: 'default' };
const HW_COLOR: Record<string, string> = { SUBMITTED: 'gold', REVIEWED: 'green' };

export default function StudentLifecyclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setLoading(true); setErr(false);
    getStudentLifecycle(Number(id))
      .then(setData)
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;
  if (err || !data) return <Result status="404" title="学员不存在" extra={<Button onClick={() => navigate('/students')}>返回学员列表</Button>} />;

  const s = data.student || {};
  const sum = data.summary || {};
  const purchase = data.purchase || {};
  const cls = data.class || {};
  const svc = data.service || {};

  const stages = [
    { title: '线索', done: sum.hasLead },
    { title: '到店体验', done: (data.lead?.trials?.length ?? 0) > 0 },
    { title: '购课', done: (purchase.orders?.length ?? 0) > 0 },
    { title: '上课', done: (cls.consumed ?? 0) > 0 },
    { title: '续课', done: (sum.renewalCount ?? 0) > 0 },
    { title: '服务', done: (svc.reviews?.length ?? 0) + (svc.homework?.length ?? 0) + (svc.complaints?.length ?? 0) + (svc.scores?.length ?? 0) > 0 },
    { title: sum.refunded ? '退费' : '结课', done: sum.graduated || sum.refunded },
  ];
  const current = stages.findIndex((x) => !x.done);
  const stepCurrent = current === -1 ? stages.length : current;

  const items = [
    {
      key: 'lead', label: '线索 / 到店体验',
      children: data.lead ? (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Descriptions size="small" bordered column={3} title="线索来源">
            <Descriptions.Item label="姓名">{data.lead.name}</Descriptions.Item>
            <Descriptions.Item label="手机">{data.lead.phone}</Descriptions.Item>
            <Descriptions.Item label="阶段"><Tag>{data.lead.stage}</Tag></Descriptions.Item>
            <Descriptions.Item label="渠道ID">{data.lead.channelId || '-'}</Descriptions.Item>
            <Descriptions.Item label="活动ID">{data.lead.campaignId || '-'}</Descriptions.Item>
            <Descriptions.Item label="意向课程">{data.lead.intentionCourse || '-'}</Descriptions.Item>
          </Descriptions>
          <Card size="small" title={`跟进记录（${data.lead.follows.length}）`}>
            <Table rowKey="id" size="small" pagination={false} dataSource={data.lead.follows}
              columns={[
                { title: '方式', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
                { title: '内容', dataIndex: 'content' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
          <Card size="small" title={`到店试听（${data.lead.trials.length}）`}>
            <Table rowKey="id" size="small" pagination={false} dataSource={data.lead.trials}
              columns={[
                { title: '试听时间', dataIndex: 'trialAt', render: (v: string) => formatDateTime(v) },
                { title: '课次ID', dataIndex: 'lessonId' },
                { title: '到店', dataIndex: 'attended', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已到店' : '未到店'}</Tag> },
                { title: '反馈', dataIndex: 'feedback', render: (v: string) => v || '-' },
              ]} />
          </Card>
        </Space>
      ) : <Tag color="default">暂无关联线索</Tag>,
    },
    {
      key: 'purchase', label: '购课 / 续课',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Space wrap>
            <Tag color="blue">订单数 {purchase.orders?.length ?? 0}</Tag>
            <Tag color="green">实付合计 {purchase.totalPaid ?? 0}</Tag>
            <Tag color="red">退费合计 {purchase.totalRefunded ?? 0}</Tag>
            <Tag color="purple">续课数 {sum.renewalCount ?? 0}</Tag>
          </Space>
          <Card size="small" title="订单">
            <Table rowKey="id" size="small" pagination={false} dataSource={purchase.orders || []}
              columns={[
                { title: '订单号', dataIndex: 'orderNo' },
                { title: '类型', render: (_: any, r: any) => <Tag color={r.id === (purchase.firstOrder?.id) ? 'blue' : 'purple'}>{r.id === (purchase.firstOrder?.id) ? '首购' : '续课'}</Tag> },
                { title: '应付', dataIndex: 'payableAmount' },
                { title: '实付', dataIndex: 'paidAmount' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={ORDER_COLOR[v] || 'default'}>{v}</Tag> },
                { title: '下单时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
          <Card size="small" title="退费">
            <Table rowKey="id" size="small" pagination={false} dataSource={purchase.refunds || []}
              columns={[
                { title: '金额', dataIndex: 'amount' },
                { title: '原因', dataIndex: 'reason', render: (v: string) => v || '-' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={REFUND_COLOR[v] || 'default'}>{v}</Tag> },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
        </Space>
      ),
    },
    {
      key: 'class', label: '上课 / 课消',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Space wrap>
            <Tag color="blue">发放课时 {cls.totalGranted ?? 0}</Tag>
            <Tag color="green">剩余课时 {cls.totalBalance ?? 0}</Tag>
            <Tag color="orange">已消课时 {cls.consumed ?? 0}</Tag>
          </Space>
          <Card size="small" title="课时账户">
            <Table rowKey="id" size="small" pagination={false} dataSource={cls.accounts || []}
              columns={[
                { title: '课程ID', dataIndex: 'courseId', render: (v: number) => v || '通用' },
                { title: '类型', dataIndex: 'type' },
                { title: '发放', dataIndex: 'totalGranted' },
                { title: '余额', dataIndex: 'balance' },
                { title: '过期', dataIndex: 'expireAt', render: (v: string) => (v || '').slice(0, 10) },
              ]} />
          </Card>
          <Card size="small" title={`消课流水（${cls.consumptions?.length ?? 0}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 8 }} dataSource={cls.consumptions || []}
              columns={[
                { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={v === 'CONSUME' ? 'orange' : 'default'}>{v}</Tag> },
                { title: '课时', dataIndex: 'hours' },
                { title: '课次ID', dataIndex: 'lessonId' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
        </Space>
      ),
    },
    {
      key: 'service', label: '服务（点评/作业/客诉/成绩）',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Card size="small" title={`家校点评（${svc.reviews?.length ?? 0}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={svc.reviews || []}
              columns={[
                { title: '评分', dataIndex: 'rating' },
                { title: '内容', dataIndex: 'content', render: (v: string) => v || '-' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
          <Card size="small" title={`作业提交（${svc.homework?.length ?? 0}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={svc.homework || []}
              columns={[
                { title: '作业ID', dataIndex: 'homeworkId' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={HW_COLOR[v] || 'default'}>{v}</Tag> },
                { title: '是否迟交', dataIndex: 'isLate', render: (v: boolean) => (v ? <Tag color="red">迟交</Tag> : '否') },
                { title: '时间', dataIndex: 'submitAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
          <Card size="small" title={`客诉（${svc.complaints?.length ?? 0}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={svc.complaints || []}
              columns={[
                { title: '标题', dataIndex: 'title' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={COMPLAINT_COLOR[v] || 'default'}>{v}</Tag> },
                { title: '等级', dataIndex: 'level' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
          <Card size="small" title={`成绩（${svc.scores?.length ?? 0}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} dataSource={svc.scores || []}
              columns={[
                { title: '课程ID', dataIndex: 'courseId' },
                { title: '类型', dataIndex: 'type' },
                { title: '分数', dataIndex: 'score' },
                { title: '等级', dataIndex: 'level', render: (v: string) => v || '-' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
        </Space>
      ),
    },
    {
      key: 'member', label: '会员 / 积分',
      children: data.membership ? (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Descriptions size="small" bordered column={3} title="会员">
            <Descriptions.Item label="等级ID">{data.membership.levelId || '-'}</Descriptions.Item>
            <Descriptions.Item label="当前积分">{data.membership.points}</Descriptions.Item>
            <Descriptions.Item label="累计积分">{data.membership.totalPoints}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={data.membership.status === 'NORMAL' ? 'green' : 'red'}>{data.membership.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="积分过期" span={2}>{data.membership.expireAt ? (data.membership.expireAt as string).slice(0, 10) : '-'}</Descriptions.Item>
          </Descriptions>
          <Card size="small" title={`积分流水（${data.membership.ledgers.length}）`}>
            <Table rowKey="id" size="small" pagination={{ pageSize: 8 }} dataSource={data.membership.ledgers}
              columns={[
                { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={v === 'EARN' ? 'green' : 'red'}>{v}</Tag> },
                { title: '积分', dataIndex: 'points' },
                { title: '说明', dataIndex: 'remark', render: (v: string) => v || '-' },
                { title: '时间', dataIndex: 'createdAt', render: (v: string) => formatDateTime(v) },
              ]} />
          </Card>
        </Space>
      ) : <Tag color="default">非会员</Tag>,
    },
    {
      key: 'timeline', label: '完整时间线',
      children: (
        <Timeline mode="left"
          items={(data.events || []).map((e: any) => ({
            color: e.stage === 'refund' ? 'red' : e.stage === 'purchase' ? 'green' : e.stage === 'class' ? 'blue' : 'gray',
            children: (
              <div>
                <b>{e.title}</b> <span style={{ color: 'rgba(0,0,0,.45)' }}>{formatDateTime(e.at)}</span>
                <div style={{ color: 'rgba(0,0,0,.65)' }}>{e.detail}</div>
              </div>
            ),
          }))} />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>返回</Button>
        <Button onClick={() => navigate(`/students/${id}`)}>学员资料</Button>
      </Space>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Descriptions size="small" bordered column={4} title={`学员：${s.name}（ID ${s.id}）`}>
          <Descriptions.Item label="手机">{s.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{s.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="性别">{s.gender ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="年龄">{s.age ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="主联系人">{s.parents?.find((p: any) => p.isMain)?.parentName || (s.parents?.[0]?.parentName) || '-'}</Descriptions.Item>
          <Descriptions.Item label="报名课程数">{s.studentCourses?.length ?? 0}</Descriptions.Item>
          <Descriptions.Item label="结课/退费">
            {sum.graduated && <Tag color="green">已结课</Tag>}
            {sum.refunded && <Tag color="red">退费</Tag>}
            {!sum.graduated && !sum.refunded && <Tag color="blue">在读</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="标签">{Array.isArray(s.tags) ? s.tags.join(',') : (s.tags || '-')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Steps size="small" current={stepCurrent} items={stages.map((st) => ({ title: st.title, status: st.done ? 'finish' : 'wait' }))} />
      </Card>

      <Card size="small">
        <Tabs items={items} />
      </Card>
    </div>
  );
}
