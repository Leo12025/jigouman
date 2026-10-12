import { theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Alert, Spin, Empty, Tooltip } from 'antd';
import PageContainer from '../components/PageContainer';
import { TrophyFilled, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { getCampusOverview } from '../api/dashboard';
import { BarChart, GaugeChart } from '../components/Charts';

const pct = (v: number) => `${((v || 0) * 100).toFixed(1)}%`;
const money = (v: number) => `¥${(v ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Campus = {
  id: number;
  name: string;
  type: string;
  rank: number;
  admission: { leads: number; trialed: number; signed: number; conversionRate: number };
  revenue: { orderCount: number; receivable: number; received: number; refundAmount: number; netCashflow: number };
  students: { total: number; studying: number; refunded: number };
  hours: { granted: number; consumed: number; balance: number; consumeRate: number };
  teaching: { attendanceRate: number; reviewedRate: number; homeworkPending: number };
  cost: { costTotal: number; stockValue: number; materialCount: number };
};

/** 列定义：key 路径 + 是否越高越好 + 格式化 */
const COLS: { key: string; title: string; path: (c: Campus) => number; higherBetter: boolean; fmt: (v: number) => string }[] = [
  { key: 'leads', title: '线索', path: (c) => c.admission.leads, higherBetter: true, fmt: (v) => `${v}` },
  { key: 'signed', title: '报名', path: (c) => c.admission.signed, higherBetter: true, fmt: (v) => `${v}` },
  { key: 'conversionRate', title: '转化率', path: (c) => c.admission.conversionRate, higherBetter: true, fmt: pct },
  { key: 'received', title: '已收', path: (c) => c.revenue.received, higherBetter: true, fmt: money },
  { key: 'netCashflow', title: '净现金流', path: (c) => c.revenue.netCashflow, higherBetter: true, fmt: money },
  { key: 'studying', title: '在学', path: (c) => c.students.studying, higherBetter: true, fmt: (v) => `${v}` },
  { key: 'consumeRate', title: '课消率', path: (c) => c.hours.consumeRate, higherBetter: true, fmt: pct },
  { key: 'attendanceRate', title: '出勤率', path: (c) => c.teaching.attendanceRate, higherBetter: true, fmt: pct },
  { key: 'homeworkPending', title: '作业待批', path: (c) => c.teaching.homeworkPending, higherBetter: false, fmt: (v) => `${v}` },
  { key: 'cost', title: '成本', path: (c) => c.cost.costTotal, higherBetter: false, fmt: money },
];

export default function CampusOverviewPage() {
  const { token } = theme.useToken();
  const [data, setData] = useState<{ campuses: Campus[]; summary: any; compare: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCampusOverview()
      .then((d) => alive && setData(d))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // 每列最佳/最差值（用于单元格高亮）
  const ranges = useMemo(() => {
    const map: Record<string, { best: number; worst: number; allEqual: boolean }> = {};
    if (!data?.campuses?.length) return map;
    for (const col of COLS) {
      const vals = data.campuses.map(col.path);
      const best = col.higherBetter ? Math.max(...vals) : Math.min(...vals);
      const worst = col.higherBetter ? Math.min(...vals) : Math.max(...vals);
      map[col.key] = { best, worst, allEqual: best === worst };
    }
    return map;
  }, [data]);

  const s = data?.summary;
  const cmp = data?.compare;

  const cell = (c: Campus, col: (typeof COLS)[number]) => {
    const v = col.path(c);
    const r = ranges[col.key];
    let color: string | undefined;
    let tag: JSX.Element | null = null;
    if (r && !r.allEqual) {
      if (v === r.best) {
        color = '#3f8600';
        tag = <RiseOutlined style={{ color: '#3f8600', marginLeft: 4 }} />;
      } else if (v === r.worst) {
        color = '#cf1322';
        tag = <FallOutlined style={{ color: '#cf1322', marginLeft: 4 }} />;
      }
    }
    return (
      <span style={{ color, fontWeight: color ? 600 : 400 }}>
        {col.fmt(v)}
        {tag}
      </span>
    );
  };

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      render: (r: number) =>
        r === 1 ? <Tag color="gold"><TrophyFilled /> 1</Tag> : <span>{r}</span>,
    },
    {
      title: '校区',
      dataIndex: 'name',
      render: (name: string, c: Campus) => (
        <span>
          {name}{' '}
          <Tag color={c.type === 'CAMPUS' ? 'blue' : 'default'}>{c.type}</Tag>
        </span>
      ),
    },
    ...COLS.map((col) => ({
      title: col.title,
      key: col.key,
      align: 'right' as const,
      render: (_: any, c: Campus) => cell(c, col),
    })),
  ];

  const barSeries = (path: (c: Campus) => number) =>
    (data?.campuses || []).map((c) => ({ label: c.name, value: Number((path(c) * 100).toFixed(1)) }));

  return (
    <PageContainer title="跨校区对比">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="总校区视角 · 跨校区汇总对比"
        description="本页聚合旗下全部校区的招生 / 经营 / 学员 / 课时 / 教学 / 成本指标，不受顶部校区切换器影响（始终为总校区全量口径）。绿色=该项最优，红色=最弱。"
      />

      <Spin spinning={loading}>
        {!data && !loading && <Empty description="暂无数据" />}

        {s && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Card size="small"><Statistic title="校区数" value={s.campusCount} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="总已收" value={money(s.received)} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="净现金流" value={money(s.netCashflow)} valueStyle={{ color: (s.netCashflow ?? 0) >= 0 ? '#3f8600' : '#cf1322' }} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="在学学员" value={s.studying} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="报名总数" value={s.signed} /></Card></Col>
            <Col span={4}><Card size="small"><Statistic title="总成本" value={money(s.costTotal)} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          </Row>
        )}

        {cmp && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small" title={<span><TrophyFilled style={{ color: '#faad14' }} /> 营收冠军</span>}>
                <div style={{ fontWeight: 600 }}>{cmp.received.top.name}</div>
                <div>{money(cmp.received.top.value)}</div>
                <div style={{ color: 'token.colorTextSecondary', fontSize: 12 }}>均值 {money(cmp.received.avg)}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" title={<span><TrophyFilled style={{ color: '#faad14' }} /> 转化冠军</span>}>
                <div style={{ fontWeight: 600 }}>{cmp.conversion.top.name}</div>
                <div>{pct(cmp.conversion.top.value)}</div>
                <div style={{ color: 'token.colorTextSecondary', fontSize: 12 }}>均值 {pct(cmp.conversion.avg)}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" title={<span><TrophyFilled style={{ color: '#faad14' }} /> 出勤冠军</span>}>
                <div style={{ fontWeight: 600 }}>{cmp.attendance.top.name}</div>
                <div>{pct(cmp.attendance.top.value)}</div>
                <div style={{ color: 'token.colorTextSecondary', fontSize: 12 }}>均值 {pct(cmp.attendance.avg)}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" title={<span><TrophyFilled style={{ color: '#faad14' }} /> 课消冠军</span>}>
                <div style={{ fontWeight: 600 }}>{cmp.consumeRate.top.name}</div>
                <div>{pct(cmp.consumeRate.top.value)}</div>
                <div style={{ color: 'token.colorTextSecondary', fontSize: 12 }}>均值 {pct(cmp.consumeRate.avg)}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" title={<span><TrophyFilled style={{ color: '#faad14' }} /> 报名冠军</span>}>
                <div style={{ fontWeight: 600 }}>{cmp.signed.top.name}</div>
                <div>{cmp.signed.top.value} 人</div>
                <div style={{ color: 'token.colorTextSecondary', fontSize: 12 }}>均值 {cmp.signed.avg.toFixed(1)}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small" title="营收最弱">
                <div style={{ fontWeight: 600, color: '#cf1322' }}>{cmp.received.bottom.name}</div>
                <div>{money(cmp.received.bottom.value)}</div>
              </Card>
            </Col>
          </Row>
        )}

        {data?.campuses?.length ? (
          <Card title="校区指标对照表" size="small" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={data.campuses}
              columns={columns}
              scroll={{ x: 1100 }}
            />
          </Card>
        ) : null}

        {data?.campuses?.length ? (
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="各校区已收金额（元）对比" style={{ marginBottom: 16 }}>
                <BarChart data={(data.campuses).map((c) => ({ label: c.name, value: c.revenue.received }))} color="#1890ff" />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="各校区报名数对比" style={{ marginBottom: 16 }}>
                <BarChart data={(data.campuses).map((c) => ({ label: c.name, value: c.admission.signed }))} color="#722ed1" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="各校区转化率对比（%）" style={{ marginBottom: 16 }}>
                <BarChart data={barSeries((c) => c.admission.conversionRate)} color="#fa8c16" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="各校区出勤率对比（%）" style={{ marginBottom: 16 }}>
                <BarChart data={barSeries((c) => c.teaching.attendanceRate)} color="#52c41a" />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="各校区课消率对比（%）" style={{ marginBottom: 16 }}>
                <BarChart data={barSeries((c) => c.hours.consumeRate)} color="#13c2c2" />
              </Card>
            </Col>
          </Row>
        ) : null}
      </Spin>
    </PageContainer>
  );
}
