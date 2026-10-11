import { useEffect, useMemo, useState } from 'react';
import { Tabs, Card, Row, Col, Statistic, Table, Tag, Alert, Spin, DatePicker, Segmented, Space } from 'antd';
import dayjs from 'dayjs';
import { getDashboard } from '../api/dashboard';
import { LineChart, BarChart, PieChart, GaugeChart, FunnelChart, GroupedBar } from '../components/Charts';

type Role = 'principal' | 'admission' | 'teaching';

const pct = (v: number) => `${((v || 0) * 100).toFixed(1)}%`;

export default function DashboardPage() {
  const [role, setRole] = useState<Role>('principal');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(6);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const params = useMemo(() => {
    if (range && range[0] && range[1]) {
      return { start: range[0].format('YYYY-MM-DD'), end: range[1].format('YYYY-MM-DD') };
    }
    return { months };
  }, [months, range]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDashboard(role, params)
      .then((d) => alive && setData(d))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [role, params]);

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
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented
          value={range ? 0 : months}
          onChange={(v) => {
            if (typeof v === 'number') {
              setRange(null);
              setMonths(v);
            }
          }}
          options={[
            { label: '近6月', value: 6 },
            { label: '近12月', value: 12 },
          ]}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => setRange((v as [dayjs.Dayjs, dayjs.Dayjs]) || null)}
          placeholder={['起始日期', '结束日期']}
        />
      </Space>
      <Spin spinning={loading}>
        {role === 'principal' && data && <Principal data={data} />}
        {role === 'admission' && data && <Admission data={data} />}
        {role === 'teaching' && data && <Teaching data={data} />}
      </Spin>
    </div>
  );
}

function DynamicMetrics({ items }: { items: any[] }) {
  if (!items?.length) return null;
  return (
    <Card title="自定义指标" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        {items.map((m) => (
          <Col span={6} key={m.code}>
            <Statistic title={m.name} value={m.value ?? 0} suffix={m.unit || ''} />
          </Col>
        ))}
      </Row>
    </Card>
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
      <DynamicMetrics items={data.dynamicMetrics} />

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

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small" title="课消率"><GaugeChart value={h.consumeRate || 0} max={1} label="已消/已购" /></Card></Col>
        <Col span={8}><Card size="small" title="班级满班率"><GaugeChart value={c.fullRate || 0} max={1} color="#52c41a" label="在班/容量" /></Card></Col>
        <Col span={8}><Card size="small" title="订单数"><Statistic title="付费/总订单" value={`${r.paidOrderCount ?? 0}/${r.orderCount ?? 0}`} /></Card></Col>
      </Row>

      <Card title="近月趋势（已收 vs 应收，单位：元）" size="small" style={{ marginBottom: 16 }}>
        <GroupedBar
          categories={(data.trend || []).map((t: any) => t.month)}
          series={[
            { name: '已收', color: '#52c41a', data: (data.trend || []).map((t: any) => t.received) },
            { name: '应收', color: '#1890ff', data: (data.trend || []).map((t: any) => t.receivable) },
          ]}
        />
        <LineChart data={(data.trend || []).map((t: any) => ({ label: t.month, value: t.consumed }))} color="#fa8c16" />
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
          <Col span={14}>
            <FunnelChart data={[
              { label: '线索', value: f.total ?? 0 },
              { label: '试听', value: f.trialed ?? 0 },
              { label: '报名', value: f.signed ?? 0 },
            ]} />
          </Col>
          <Col span={10}>
            <div style={{ paddingTop: 20 }}>
              <GaugeChart value={f.conversionRate || 0} max={1} label="转化率" color="#fa8c16" />
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
      <DynamicMetrics items={data.dynamicMetrics} />

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

      <Card title="招生漏斗" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={14}>
            <FunnelChart data={[
              { label: '线索', value: f.total ?? 0 },
              { label: '试听', value: f.trialed ?? 0 },
              { label: '报名', value: f.signed ?? 0 },
            ]} />
          </Col>
          <Col span={10}>
            <div style={{ paddingTop: 20 }}>
              <GaugeChart value={f.conversionRate || 0} max={1} label="转化率" color="#fa8c16" />
            </div>
          </Col>
        </Row>
      </Card>

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
      <DynamicMetrics items={data.dynamicMetrics} />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" title="出勤率"><GaugeChart value={a.attendanceRate || 0} max={1} label="出勤/应到" color="#52c41a" /></Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="作业批改率"><GaugeChart value={hw.reviewedRate || 0} max={1} label="已批改/已交" color="#722ed1" /></Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="关键计数">
            <Statistic title="布置作业" value={hw.assigned ?? 0} />
            <Statistic title="优秀作业" value={hw.excellent ?? 0} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="逾期提交" value={hw.late ?? 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

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
          <Card size="small" title="待办聚合（按类型）">
            <Table
              size="small"
              pagination={false}
              dataSource={(tasks.byType || []).map((x: any, i: number) => ({ ...x, key: i }))}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '待办数', dataIndex: 'count' },
              ]}
            />
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

      <Card title="待办概览" size="small">
        <div>
          <Tag>待办总数 {tasks.pending ?? 0}</Tag>
          <Tag>课后点评 {data.courseReview?.count ?? 0}</Tag>
        </div>
      </Card>
    </>
  );
}
