import { useEffect, useState } from 'react';
import { Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDashboardScreen } from '../api/dashboard';
import { LineChart, BarChart, PieChart } from '../components/Charts';

const money = (v: number) => `¥${Math.round((v || 0) * 100) / 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = (v: number) => `${((v || 0) * 100).toFixed(1)}%`;

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t.toLocaleString('zh-CN', { hour12: false });
}

export default function BigScreenPage() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const clock = useClock();

  const load = () => getDashboardScreen().then(setData).catch(() => undefined);
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const k = data?.kpis || {};
  const trend = data?.trend || [];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#06223f,#0a3060 60%,#06223f)', color: '#e6f0ff', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>机构经营数据大屏</span>
          <Tag color="blue" style={{ marginLeft: 12 }}>实时</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 16, fontFamily: 'monospace' }}>{clock}</span>
          <Button onClick={() => nav('/dashboard')}>退出大屏</Button>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi label="应收总额" value={money(k.receivable)} color="#1890ff" />
        <Kpi label="已收总额" value={money(k.received)} color="#52c41a" />
        <Kpi label="净现金流" value={money(k.netCashflow)} color={(k.netCashflow ?? 0) >= 0 ? '#52c41a' : '#ff4d4f'} />
        <Kpi label="在读数" value={`${k.studying ?? 0}`} color="#13c2c2" />
        <Kpi label="转化率" value={pct(k.conversionRate)} color="#faad14" />
        <Kpi label="课消率" value={pct(k.consumeRate)} color="#1890ff" />
        <Kpi label="满班率" value={pct(k.fullRate)} color="#722ed1" />
        <Kpi label="出勤率" value={pct(k.attendanceRate)} color="#eb2f96" />
      </div>

      {/* 图表区 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 14 }}>
        <Panel title="近 6 月营收趋势（已收 / 应收）">
          <LineChart data={trend.map((t: any) => ({ label: t.month, value: t.received }))} color="#52c41a" height={200} />
          <LineChart data={trend.map((t: any) => ({ label: t.month, value: t.receivable }))} color="#1890ff" height={200} />
        </Panel>
        <Panel title="招生漏斗（线索 / 试听 / 报名）">
          <BarChart data={[
            { label: '线索', value: k.leads ?? 0 },
            { label: '试听', value: data?.funnel?.trialed ?? 0 },
            { label: '报名', value: k.signed ?? 0 },
          ]} color="#1890ff" height={200} />
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Panel title="渠道线索 Top">
          <BarChart data={(data?.byChannel || []).slice(0, 6).map((x: any) => ({ label: x.name, value: x.count }))} color="#722ed1" height={200} />
        </Panel>
        <Panel title="出勤 / 作业构成">
          <PieChart data={[
            { label: '出勤', value: data?.kpis?.attendanceRate ? Math.round((k.attendanceRate ?? 0) * 100) : 0 },
            { label: '缺勤', value: Math.round((1 - (k.attendanceRate ?? 0)) * 100) },
          ]} height={200} />
        </Panel>
        <Panel title="风险预警">
          {(data?.alerts || []).length ? (
            (data.alerts as any[]).map((al: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                <Tag color={al.value > 0 ? 'warning' : 'success'}>{al.label}</Tag>
                <span style={{ marginLeft: 8 }}>{al.value}</span>
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.6, paddingTop: 20 }}>暂无预警</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, borderLeft: '3px solid #1890ff', paddingLeft: 8 }}>{title}</div>
      {children}
    </div>
  );
}
