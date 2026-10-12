import { useEffect, useState } from 'react';
import { Card, Row, Col, Space, Typography } from 'antd';
import PageContainer from '../components/PageContainer';
import {
  TeamOutlined,
  BookOutlined,
  SolutionOutlined,
  FundProjectionScreenOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getFunnel, getTaskStats } from '../api/crm';

const ENTRIES = [
  { key: '/leads', label: '线索 CRM', desc: '录入/分配/跟进/试听/转化', icon: <TeamOutlined /> },
  { key: '/funnel', label: '转化漏斗', desc: '按渠道/活动查看转化', icon: <FundProjectionScreenOutlined /> },
  { key: '/courses', label: '课程管理', desc: '课程/分类/上下架', icon: <BookOutlined /> },
  { key: '/students', label: '学员档案', desc: '学员/家长/报名', icon: <SolutionOutlined /> },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [todoStats, setTodoStats] = useState<any>(null);

  useEffect(() => {
    getFunnel({}).then(setStats).catch(() => undefined);
    getTaskStats().then(setTodoStats).catch(() => undefined);
  }, []);

  return (
    <PageContainer title="工作台">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { title: '总线索', value: stats?.total ?? '-' },
          { title: '已试听', value: stats?.trialed ?? '-' },
          { title: '已报名', value: stats?.signed ?? '-' },
          { title: '转化率', value: stats ? `${(stats.conversionRate * 100).toFixed(1)}%` : '-' },
        ].map((s) => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <div style={{ color: 'rgba(0,0,0,.45)' }}>{s.title}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" hoverable onClick={() => navigate('/tasks')}>
            <div style={{ color: 'rgba(0,0,0,.45)' }}><BellOutlined /> 我的待办</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{todoStats?.total ?? '-'}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" hoverable onClick={() => navigate('/tasks')}>
            <div style={{ color: 'rgba(0,0,0,.45)' }}>逾期</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}><Typography.Text type="warning">{todoStats?.overdue ?? '-'}</Typography.Text></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" hoverable onClick={() => navigate('/tasks')}>
            <div style={{ color: 'rgba(0,0,0,.45)' }}>严重逾期</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}><Typography.Text type="danger">{todoStats?.severeOverdue ?? '-'}</Typography.Text></div>
          </Card>
        </Col>
      </Row>
      <Card title="快捷入口" size="small">
        <Row gutter={[16, 16]}>
          {ENTRIES.map((e) => (
            <Col span={6} key={e.key}>
              <Card hoverable size="small" onClick={() => navigate(e.key)}>
                <Space direction="vertical">
                  {e.icon}
                  <div style={{ fontWeight: 600 }}>{e.label}</div>
                  <div style={{ color: 'rgba(0,0,0,.45)' }}>{e.desc}</div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </PageContainer>
  );
}
