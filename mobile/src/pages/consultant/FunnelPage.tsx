import { useEffect, useState } from 'react';
import { Card, Toast, ProgressBar } from 'antd-mobile';
import { getFunnel } from '../../api/staff';
import BottomTab from '../../components/BottomTab';

/** 顾问端转化漏斗（§4.3 / §11.6） */
export default function FunnelPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    getFunnel().then(setData).catch(() => Toast.show({ content: '加载漏斗失败' }));
  }, []);

  const stages: { label: string; value: number }[] = data
    ? (Array.isArray(data) ? data : Object.entries(data).map(([label, value]) => ({ label, value: Number(value) })))
    : [];

  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <div className="page">
      <div className="page-title">转化漏斗</div>
      <div style={{ padding: 12 }}>
        {stages.length ? stages.map((s) => (
          <Card key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
            <ProgressBar percent={Math.round((s.value / max) * 100)} />
          </Card>
        )) : <Card><div style={{ padding: 12, color: '#999' }}>暂无漏斗数据</div></Card>}
      </div>
      <BottomTab />
    </div>
  );
}
