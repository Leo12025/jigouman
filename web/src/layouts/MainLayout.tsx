import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Grid, Dropdown, Avatar, Tag } from 'antd';
import {
  TeamOutlined,
  PartitionOutlined,
  ThunderboltOutlined,
  FundProjectionScreenOutlined,
  BookOutlined,
  ReconciliationOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SolutionOutlined,
  SafetyCertificateOutlined,
  TeamOutlined as Team2Outlined,
  HomeOutlined,
  LogoutOutlined,
  DownOutlined,
  DollarOutlined,
  BellOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, getToken } from '../api/client';
import { fetchProfile } from '../api/crm';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isNarrow = !screens.lg;
  const selected = '/' + (location.pathname.split('/')[1] || 'leads');

  useEffect(() => {
    if (getToken()) {
      fetchProfile()
        .then(setProfile)
        .catch(() => undefined);
    }
  }, []);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    {
      key: 'group-course',
      type: 'group' as const,
      label: '课程学员',
      children: [
        { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
        { key: '/class-groups', icon: <Team2Outlined />, label: '班级管理' },
        { key: '/lessons', icon: <CalendarOutlined />, label: '课次排课' },
        { key: '/students', icon: <SolutionOutlined />, label: '学员档案' },
        { key: '/orders', icon: <ReconciliationOutlined />, label: '订单与财务' },
        { key: '/hours', icon: <ClockCircleOutlined />, label: '课时管理' },
        { key: '/finance', icon: <DollarOutlined />, label: '财务对账' },
        { key: '/tasks', icon: <BellOutlined />, label: '待办中心' },
        { key: '/homework', icon: <FileTextOutlined />, label: '作业管理' },
      ],
    },
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
    {
      key: 'group-system',
      type: 'group' as const,
      label: '系统管理',
      children: [
        { key: '/users', icon: <UserOutlined />, label: '用户管理' },
        { key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色权限' },
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
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={208}>
          <div style={{ padding: 16 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              机构管理系统
            </Typography.Title>
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
            {/* 机构/校区（多校区切换在 M8 引入 organization 后开放） */}
            <Tag color="blue">{profile?.orgName || '机构'}</Tag>
            <Dropdown
              menu={{
                items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }],
                onClick: ({ key }) => key === 'logout' && onLogout(),
              }}
            >
              <Button type="text" style={{ height: 32 }}>
                <Space>
                  <Avatar size={20} icon={<UserOutlined />} />
                  <Text>{profile?.name || profile?.username || '未登录'}</Text>
                  {profile?.roles?.length ? (
                    <Tag>{profile.roles.map((r: any) => r.name).join('/')}</Tag>
                  ) : null}
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
