import { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Select, Button, Space, Progress, theme } from 'antd';
import { listChannels, listCampaigns, getFunnel } from '../api/crm';
import type { Funnel, Channel, Campaign, LeadStage } from '../api/types';
import { LEAD_STAGES, LEAD_STAGE_LABEL } from '../api/types';

export default function FunnelPage() {
  const { token } = theme.useToken();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channelId, setChannelId] = useState<number | undefined>();
  const [campaignId, setCampaignId] = useState<number | undefined>();
  const [data, setData] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (channelId) params.channelId = channelId;
      if (campaignId) params.campaignId = campaignId;
      setData(await getFunnel(params));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listChannels().then(setChannels).catch(() => {});
    listCampaigns().then(setCampaigns).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channelOptions = useMemo(() => channels.map((c) => ({ value: c.id, label: c.name })), [channels]);
  const campaignOptions = useMemo(() => campaigns.map((c) => ({ value: c.id, label: c.name })), [campaigns]);

  const stageColor = (s: LeadStage) => {
    switch (s) {
      case 'NEW':
        return token.colorInfo;
      case 'FOLLOWING':
        return token.colorPrimary;
      case 'TRIALED':
        return token.colorWarning;
      case 'SIGNED':
        return token.colorSuccess;
      default:
        return token.colorError;
    }
  };

  const total = data?.total || 0;

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="渠道"
          allowClear
          style={{ width: 160 }}
          options={channelOptions}
          onChange={setChannelId}
        />
        <Select
          placeholder="活动"
          allowClear
          style={{ width: 180 }}
          options={campaignOptions}
          onChange={setCampaignId}
        />
        <Button type="primary" onClick={load} loading={loading}>
          查询
        </Button>
      </Space>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总线索" value={total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已试听" value={data?.trialed || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已报名" value={data?.signed || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="转化率"
              value={((data?.conversionRate || 0) * 100).toFixed(1)}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card title="阶段分布" size="small">
        {LEAD_STAGES.map((s) => {
          const cnt = data?.byStage?.[s] || 0;
          const pct = total ? Math.round((cnt / total) * 100) : 0;
          return (
            <div key={s} style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4 }}>
                {LEAD_STAGE_LABEL[s]} · {cnt} 条（{pct}%）
              </div>
              <Progress percent={pct} strokeColor={stageColor(s)} showInfo={false} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
