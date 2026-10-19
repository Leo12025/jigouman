import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Tag } from 'antd-mobile';
import { listPublicActivities } from '../../api/groupon';

/** 拼团活动落地页（C 端 H5 入口，公开可分享） */
export default function GroupBuyLandingPage() {
  const navigate = useNavigate();
  const [acts, setActs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    listPublicActivities()
      .then((r: any) => setActs(Array.isArray(r) ? r : (r?.list || [])))
      .catch(() => setActs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="page-title">拼团福利 · 邀好友更划算</div>
      {loading && <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>加载中…</div>}
      <List>
        {acts.map((a) => (
          <List.Item
            key={a.id}
            onClick={() => navigate(`/groupon/${a.id}`)}
            extra={
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#f50', fontSize: 18, fontWeight: 700 }}>¥{Number(a.price || 0).toFixed(2)}</div>
                {a.leaderPrice != null && (
                  <Tag color="gold" style={{ marginTop: 4 }}>团长 ¥{Number(a.leaderPrice).toFixed(2)}</Tag>
                )}
              </div>
            }
          >
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
              {a.groupSize} 人成团 · 发 {a.hours || 0} 课时
              {a.teamValidHours ? ` · ${a.teamValidHours}h 内成团` : ''}
            </div>
          </List.Item>
        ))}
      </List>
      {!loading && !acts.length && (
        <Card style={{ marginTop: 16, textAlign: 'center', color: '#999' }}>暂无进行中的拼团活动</Card>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}
