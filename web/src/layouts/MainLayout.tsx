import { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Grid } from 'antd';
import {
  TeamOutlined,
  PartitionOutlined,
  ThunderboltOutlined,
  FundProjectionScreenOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken } from '../api/client';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();

  const isNarrow = !screens.lg;

  const selected = '/' + (location.pathname.split('/')[1] || 'leads');

  const menuItems = [
    {
      key: 'group-crm',
      type: 'group' as const,
      label: '招生营销',
      children: [
        { key: '/leads', icon: <TeamOutlined />, label: '线索 CRM' },
        { key: '/funnel', icon: <FundProjectionScreenOutlined />, label: '转化漏斗' },
        { key: '/channels', icon: <PartitionOutlined />, label: '渠道管理' },
        { key: '/campaigns', icon: <ThunderboltOutlined />, label: '市场活动' },
      ],
    },
  ];

  const onLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isNarrow && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={208}
        >
          <div style={{ padding: 16 }}>
            <Title level={5} style={{ margin: 0 }}>
              机构管理系统
            </Title>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={menuItems}
            onClick={(e) => navigate(e.key)}
          />
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            padding: '0 16px',
          }}
        >
          {isNarrow && (
            <Button type="text" onClick={() => setCollapsed(!collapsed)}>
              菜单
            </Button>
          )}
          <Space>
            <span>教务/招生</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={onLogout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
