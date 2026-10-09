import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Grid, Dropdown, Avatar, Tag, Badge, Popover } from 'antd';
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
  AuditOutlined,
  ApiOutlined,
  TeamOutlined as Team2Outlined,
  HomeOutlined,
  LogoutOutlined,
  DownOutlined,
  DollarOutlined,
  BellOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, getToken } from '../api/client';
import {
  fetchProfile,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/crm';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [noticeList, setNoticeList] = useState<any[]>([]);
  const [noticeVisible, setNoticeVisible] = useState(false);
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
      getUnreadCount()
        .then((r) => setUnread(r.count))
        .catch(() => undefined);
    }
  }, []);

  const openNotice = async () => {
    const r = await getNotifications({ page: 1, size: 10, unreadOnly: 1 }).catch(() => null);
    if (r) setNoticeList(r.list);
  };
  const onNoticeOpenChange = (open: boolean) => {
    if (open) openNotice();
    setNoticeVisible(open);
  };
  const onRead = async (id: number) => {
    await markNotificationRead(id).catch(() => undefined);
    setNoticeList((l) => l.filter((x) => x.id !== id));
    setUnread((u) => Math.max(0, u - 1));
  };
  const onReadAll = async () => {
    await markAllNotificationsRead().catch(() => undefined);
    setNoticeList([]);
    setUnread(0);
  };

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/dashboard', icon: <BarChartOutlined />, label: '数据看板' },
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
        { key: '/approval-flows', icon: <AuditOutlined />, label: '审批流配置' },
        { key: '/channels', icon: <ApiOutlined />, label: '消息渠道配置' },
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
            <Popover
              open={noticeVisible}
              onOpenChange={onNoticeOpenChange}
              trigger="click"
              content={
                <div style={{ width: 300, maxHeight: 360, overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <b>通知</b>
                    <Button type="link" size="small" onClick={onReadAll}>全部已读</Button>
                  </div>
                  {noticeList.length === 0 && (
                    <div style={{ color: 'rgba(0,0,0,.45)' }}>暂无未读通知</div>
                  )}
                  {noticeList.map((n) => (
                    <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div style={{ color: 'rgba(0,0,0,.45)', fontSize: 12 }}>{n.content}</div>
                      <Button type="link" size="small" onClick={() => onRead(n.id)}>标记已读</Button>
                    </div>
                  ))}
                </div>
              }
            >
              <Badge count={unread} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Popover>
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
