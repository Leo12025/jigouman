import { useEffect, useState } from 'react';
import { Tabs, Card, Row, Col, Statistic, Table, Progress, Tag, Alert, Spin } from 'antd';
import { getDashboard } from '../api/dashboard';
import { LineChart, BarChart, PieChart } from '../components/Charts';

type Role = 'principal' | 'admission' | 'teaching';

const pct = (v: number) => `${((v || 0) * 100).toFixed(1)}%`;

export default function DashboardPage() {
  const [role, setRole] = useState<Role>('principal');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDashboard(role, {})
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <div>
      <Tabs
        activeKey={role}
        onChange={(k) => setRole(k as Role)}
        items={[
          { key: 'principal', label: '经营看板' },
          { key: 'admission', label: '招生看板' },
          { key: 'teaching', label: '教学看板' },
        ]}
      />
      <Spin spinning={loading}>
        {role === 'principal' && data && <Principal data={data} />}
        {role === 'admission' && data && <Admission data={data} />}
        {role === 'teaching' && data && <Teaching data={data} />}
      </Spin>
    </div>
  );
}

function Principal({ data }: { data: any }) {
  const r = data.revenue || {};
  const s = data.students || {};
  const h = data.hours || {};
  const c = data.classGroups || {};
  const f = data.admissionSummary || {};
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="应收总额" value={r.receivable ?? 0} precision={2} prefix="¥" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已收总额" value={r.received ?? 0} precision={2} prefix="¥" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="退款金额" value={r.refundAmount ?? 0} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="净现金流" value={r.netCashflow ?? 0} precision={2} prefix="¥" valueStyle={{ color: (r.netCashflow ?? 0) >= 0 ? '#3f8600' : '#cf1322' }} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="在读数" value={s.studying ?? 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="退费学员" value={s.refunded ?? 0} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="课消率" value={pct(h.consumeRate)} suffix="" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="班级满班率" value={pct(c.fullRate)} /></Card></Col>
      </Row>

      <Card title="近 6 月趋势（已收 / 应收）" size="small" style={{ marginBottom: 16 }}>
        <LineChart data={(data.trend || []).map((t: any) => ({ label: t.month, value: t.received }))} color="#52c41a" />
        <LineChart data={(data.trend || []).map((t: any) => ({ label: t.month, value: t.receivable }))} color="#1890ff" />
        <Table
          size="small"
          pagination={false}
          dataSource={(data.trend || []).map((t: any, i: number) => ({ ...t, key: i }))}
          columns={[
            { title: '月份', dataIndex: 'month' },
            { title: '应收', dataIndex: 'receivable', render: (v: number) => `¥${v ?? 0}` },
            { title: '已收', dataIndex: 'received', render: (v: number) => `¥${v ?? 0}` },
            { title: '消课(课时)', dataIndex: 'consumed' },
          ]}
        />
      </Card>

      <Card title="招生漏斗摘要" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <BarChart data={[
              { label: '线索', value: f.total ?? 0 },
              { label: '试听', value: f.trialed ?? 0 },
              { label: '报名', value: f.signed ?? 0 },
            ]} color="#1890ff" />
          </Col>
          <Col span={12}>
            <div style={{ paddingTop: 8 }}>
              <Row gutter={16}>
                <Col span={6}><Statistic title="线索总数" value={f.total ?? 0} /></Col>
                <Col span={6}><Statistic title="已试听" value={f.trialed ?? 0} /></Col>
                <Col span={6}><Statistic title="已报名" value={f.signed ?? 0} /></Col>
                <Col span={6}><Statistic title="转化率" value={pct(f.conversionRate)} /></Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Tag>班级数 {c.count}</Tag>
                <Tag>总容量 {c.totalCapacity}</Tag>
                <Tag>在班人数 {c.enrolled}</Tag>
                <Tag>课时结余 {h.balance}</Tag>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </>
  );
}

function Admission({ data }: { data: any }) {
  const f = data.funnel || {};
  const byStage = f.byStage || {};
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="线索总数" value={f.total ?? 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已试听" value={f.trialed ?? 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已报名" value={f.signed ?? 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="转化率" value={pct(f.conversionRate)} /></Card></Col>
      </Row>

      <Alert
        type={data.pendingFollow > 0 ? 'warning' : 'success'}
        showIcon
        message={`超 7 天未跟进线索：${data.pendingFollow} 条`}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Card title="按渠道(线索数 Top)" size="small" style={{ marginBottom: 16 }}>
            <BarChart data={(data.byChannel || []).slice(0, 8).map((x: any) => ({ label: x.name, value: x.count }))} color="#722ed1" />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按活动(线索数 Top)" size="small" style={{ marginBottom: 16 }}>
            <BarChart data={(data.byCampaign || []).slice(0, 8).map((x: any) => ({ label: x.name, value: x.count }))} color="#fa8c16" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="各阶段分布" size="small" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={Object.entries(byStage).map(([stage, count]) => ({ stage, count }))}
              columns={[
                { title: '阶段', dataIndex: 'stage' },
                { title: '数量', dataIndex: 'count' },
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="按渠道分布" size="small" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={(data.byChannel || []).map((x: any, i: number) => ({ ...x, key: i }))}
              columns={[
                { title: '渠道', dataIndex: 'name' },
                { title: '线索数', dataIndex: 'count' },
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="按活动分布" size="small" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={(data.byCampaign || []).map((x: any, i: number) => ({ ...x, key: i }))}
              columns={[
                { title: '活动', dataIndex: 'name' },
                { title: '线索数', dataIndex: 'count' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function Teaching({ data }: { data: any }) {
  const a = data.attendance || {};
  const hw = data.homework || {};
  const tasks = data.tasks || {};
  const present = a.present ?? 0;
  const absent = Math.max(0, (a.total ?? 0) - present);
  const reviewed = hw.reviewed ?? 0;
  const unreviewed = Math.max(0, (hw.submitted ?? 0) - reviewed);
  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" title="出勤构成">
            <PieChart data={[{ label: '出勤', value: present }, { label: '缺勤', value: absent }]} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="作业批改构成">
            <PieChart data={[{ label: '已批改', value: reviewed }, { label: '待批改', value: unreviewed }]} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="关键计数">
            <Statistic title="布置作业" value={hw.assigned ?? 0} />
            <Statistic title="优秀作业" value={hw.excellent ?? 0} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="逾期提交" value={hw.late ?? 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <Card title="风险预警" size="small" style={{ marginBottom: 16 }}>
        {(data.alerts || []).map((al: any) => (
          <Alert
            key={al.code}
            type={al.value > 0 ? 'warning' : 'success'}
            showIcon
            message={`${al.label}：${al.value}`}
            style={{ marginBottom: 8 }}
          />
        ))}
      </Card>

      <Card title="待办聚合（按类型）" size="small">
        <Table
          size="small"
          pagination={false}
          dataSource={(tasks.byType || []).map((x: any, i: number) => ({ ...x, key: i }))}
          columns={[
            { title: '类型', dataIndex: 'type' },
            { title: '待办数', dataIndex: 'count' },
          ]}
        />
        <div style={{ marginTop: 12 }}>
          <Tag>待办总数 {tasks.pending ?? 0}</Tag>
          <Tag>课后点评 {data.courseReview?.count ?? 0}</Tag>
        </div>
      </Card>
    </>
  );
}
