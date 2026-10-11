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

/** 仪表盘：半圆进度（value/max 计算百分比，max 默认 100；比率类传 max=1） */
export function GaugeChart({
  value,
  max = 100,
  label,
  height = 140,
  color = '#1890ff',
  labelColor = 'rgba(0,0,0,.5)',
}: {
  value: number;
  max?: number;
  label?: string;
  height?: number;
  color?: string;
  labelColor?: string;
}) {
  const w = 200;
  const cx = w / 2;
  const cy = height - 16;
  const r = w / 2 - 22;
  const ratio = Math.max(0, Math.min(1, (value || 0) / (max || 1)));
  const polar = (a: number, rad: number) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const [bgX0, bgY0] = polar(Math.PI, r);
  const [bgX1, bgY1] = polar(Math.PI * 2, r);
  const [fgX0, fgY0] = polar(Math.PI, r);
  const [fgX1, fgY1] = polar(Math.PI + ratio * Math.PI, r);
  const large = ratio > 0.5 ? 1 : 0;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height}>
      <path d={`M${bgX0},${bgY0} A${r},${r} 0 0 1 ${bgX1},${bgY1}`} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="12" strokeLinecap="round" />
      <path d={`M${fgX0},${fgY0} A${r},${r} 0 ${large} 1 ${fgX1},${fgY1}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 20} fontSize="20" fontWeight={600} fill={color} textAnchor="middle">
        {(ratio * 100).toFixed(1)}%
      </text>
      {label && (
        <text x={cx} y={cy + 2} fontSize="11" fill={labelColor} textAnchor="middle">
          {label}
        </text>
      )}
    </svg>
  );
}

/** 漏斗：各阶段依次收窄（宽度相对首项） */
export function FunnelChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return <Empty h={height} />;
  const top = data[0]?.value || 1;
  const n = data.length;
  const w = 320;
  const rowH = (height - 20) / n;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height}>
      {data.map((d, i) => {
        const topW = (d.value / top) * (w - 40);
        const nextV = i < n - 1 ? data[i + 1].value : 0;
        const botW = (nextV / top) * (w - 40);
        const y0 = 10 + i * rowH;
        const y1 = 10 + (i + 1) * rowH;
        const x0 = (w - topW) / 2;
        const x1 = (w - botW) / 2;
        const path = `M${x0},${y0} L${x0 + topW},${y0} L${x1 + botW},${y1} L${x1},${y1} Z`;
        return (
          <g key={i}>
            <path d={path} fill={COLORS[i % COLORS.length]} opacity={0.85}>
              <title>{`${d.label}: ${d.value}`}</title>
            </path>
            <text x={w / 2} y={(y0 + y1) / 2 + 4} fontSize="11" fill="#fff" textAnchor="middle">
              {d.label} {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 多系列分组柱状图 */
export function GroupedBar({
  categories,
  series,
  height = 200,
}: {
  categories: string[];
  series: { name: string; color?: string; data: number[] }[];
  height?: number;
}) {
  if (!categories.length) return <Empty h={height} />;
  const w = 320;
  const pad = 24;
  const h = height;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all, 1);
  const groupW = (w - pad * 2) / categories.length;
  const barW = (groupW * 0.7) / Math.max(1, series.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {categories.map((c, gi) => {
        const gx = pad + gi * groupW + groupW * 0.15;
        return series.map((s, si) => {
          const v = s.data[gi] ?? 0;
          const bh = (v / max) * (h - pad * 2);
          const x = gx + si * barW;
          const y = h - pad - bh;
          return (
            <rect key={`${gi}-${si}`} x={x} y={y} width={Math.max(1, barW - 2)} height={bh} rx="2" fill={s.color || COLORS[si % COLORS.length]}>
              <title>{`${c} ${s.name}: ${v}`}</title>
            </rect>
          );
        });
      })}
      {categories.map((c, gi) => (
        <text key={gi} x={pad + gi * groupW + groupW / 2} y={h - 6} fontSize="9" fill="rgba(0,0,0,.45)" textAnchor="middle">
          {c}
        </text>
      ))}
      {series.map((s, si) => (
        <g key={`lg-${si}`} transform={`translate(${pad + si * 76}, 6)`}>
          <rect width="8" height="8" rx="2" fill={s.color || COLORS[si % COLORS.length]} />
          <text x="12" y="8" fontSize="9" fill="rgba(0,0,0,.6)">
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Empty({ h }: { h: number }) {
  return <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,.25)', fontSize: 12 }}>暂无数据</div>;
}
