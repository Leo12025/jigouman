// 轻量 SVG 图表组件（无第三方依赖，适配大屏/看板可视化）
import React from 'react';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

export function LineChart({ data, height = 160, color = '#1890ff' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const w = 320;
  const h = height;
  const pad = 24;
  if (!data.length) return <Empty h={h} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - ((d.value - min) / span) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lc)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="2.5" fill={color} />
          <text x={p[0]} y={h - 6} fontSize="9" fill="rgba(0,0,0,.45)" textAnchor="middle">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ data, height = 160, color = '#1890ff' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const w = 320;
  const h = height;
  const pad = 24;
  if (!data.length) return <Empty h={h} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (w - pad * 2) / data.length * 0.6;
  const step = (w - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - pad * 2);
        const x = pad + i * step + (step - bw) / 2;
        const y = h - pad - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="2" fill={color}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + bw / 2} y={y - 4} fontSize="9" fill="rgba(0,0,0,.65)" textAnchor="middle">{d.value}</text>
            <text x={x + bw / 2} y={h - 6} fontSize="9" fill="rgba(0,0,0,.45)" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function PieChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const h = height;
  const size = h;
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {data.map((d, i) => {
          const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          acc += d.value;
          const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          return <path key={i} d={`M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`} fill={d.color || COLORS[i % COLORS.length]} />;
        })}
      </svg>
      <div style={{ flex: 1, fontSize: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: d.color || COLORS[i % COLORS.length], marginRight: 6 }} />{d.label}</span>
            <span>{d.value}（{((d.value / total) * 100).toFixed(1)}%）</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ h }: { h: number }) {
  return <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,.25)', fontSize: 12 }}>暂无数据</div>;
}
