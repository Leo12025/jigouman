import { useEffect, useState } from 'react';
import {
  Layout, Menu, Button, Space, Typography, Grid, Dropdown, Avatar, Tag, Badge, Popover, Select, Drawer, theme,
} from 'antd';
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
  SwapOutlined,
  ApiOutlined,
  HomeOutlined,
  LogoutOutlined,
  ApartmentOutlined,
  DownOutlined,
  DollarOutlined,
  BellOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CustomerServiceOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  FolderOpenOutlined,
  TagsOutlined,
  ShareAltOutlined,
  VideoCameraOutlined,
  FunnelPlotOutlined,
  SettingOutlined,
  RiseOutlined,
  WalletOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, getToken, getCurrentOrg, setCurrentOrg } from '../api/client';
import {
  fetchProfile,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  orgTree,
} from '../api/crm';
import { useTenantConfig } from '../context/TenantConfig';
import { MENU_KEY_TO_FEATURE } from '../features';

/** 将组织树展平为校区下拉选项（HQ/分校/校区均可选） */
const flattenOrgs = (nodes: any[], out: { value: number; label: string }[] = []): { value: number; label: string }[] => {
  nodes?.forEach((n) => {
    out.push({ value: n.id, label: `${n.name}（${n.type}）` });
    if (n.children?.length) flattenOrgs(n.children, out);
  });
  return out;
};

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const { token } = theme.useToken();
  // 当前选中菜单：取路径第一段；为空（首页 "/"）时指向首页
  const location = useLocation();
  const seg = location.pathname.split('/')[1];
  const selected = seg ? '/' + seg : '/';

  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [noticeList, setNoticeList] = useState<any[]>([]);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const navigate = useNavigate();
  // 租户自助配置（主题/功能开关）+ 是否有机构设置权限
  const { config } = useTenantConfig();
  const canManageTenant = profile?.permissions?.includes('tenant:manage');
  const screens = Grid.useBreakpoint();
  const isNarrow = !screens.lg;
  const [campusOpts, setCampusOpts] = useState<{ value: number; label: string }[]>([]);
  const [orgSel, setOrgSel] = useState<number | null>(getCurrentOrg());

  useEffect(() => {
    if (getToken()) {
      fetchProfile()
        .then(setProfile)
        .catch(() => undefined);
      getUnreadCount()
        .then((r) => setUnread(r.count))
        .catch(() => undefined);
      // 校区切换器：加载组织树并展平
      orgTree().then((t) => setCampusOpts(flattenOrgs(t))).catch(() => undefined);
    }
  }, []);

  // 受限用户（profile.orgIds 非空）：默认选中首个归属校区，避免停留在「全部校区」视图
  useEffect(() => {
    if (profile?.orgIds?.length) {
      const cur = getCurrentOrg();
      if (cur == null || !profile.orgIds.includes(cur)) {
        const first = profile.orgIds[0];
        setCurrentOrg(first);
        setOrgSel(first);
      }
    }
  }, [profile]);

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
    { key: '/campus-overview', icon: <PartitionOutlined />, label: '跨校区对比' },
    { key: '/big-screen', icon: <FundProjectionScreenOutlined />, label: '数据大屏' },
    {
      key: 'sub-teaching',
      icon: <ReadOutlined />,
      label: '教务教学',
      children: [
        { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
        { key: '/course-packages', icon: <AppstoreOutlined />, label: '课包管理' },
        { key: '/coursewares', icon: <ContainerOutlined />, label: '课件管理' },
        { key: '/resources', icon: <FolderOpenOutlined />, label: '资源库' },
        { key: '/class-groups', icon: <TeamOutlined />, label: '班级管理' },
        { key: '/lessons', icon: <CalendarOutlined />, label: '课次排课' },
        { key: '/class-change', icon: <SwapOutlined />, label: '调课/转班' },
        { key: '/teaching', icon: <VideoCameraOutlined />, label: '在线课堂/督学' },
        { key: '/reviews', icon: <FileTextOutlined />, label: '课后点评' },
      ],
    },
    {
      key: 'sub-student',
      icon: <SolutionOutlined />,
      label: '学员服务',
      children: [
        { key: '/students', icon: <SolutionOutlined />, label: '学员档案' },
        { key: '/hours', icon: <ClockCircleOutlined />, label: '课时管理' },
        { key: '/homework', icon: <FileTextOutlined />, label: '作业管理' },
        { key: '/scores', icon: <LineChartOutlined />, label: '成绩管理' },
      ],
    },
    {
      key: 'sub-finance',
      icon: <DollarOutlined />,
      label: '财务管理',
      children: [
        { key: '/orders', icon: <ReconciliationOutlined />, label: '订单与财务' },
        { key: '/stored-value', icon: <WalletOutlined />, label: '储值卡' },
        { key: '/package-upgrades', icon: <RiseOutlined />, label: '套餐升级' },
        { key: '/finance', icon: <DollarOutlined />, label: '财务对账' },
      ],
    },
    {
      key: 'sub-crm',
      icon: <ThunderboltOutlined />,
      label: '招生营销',
      children: [
        { key: '/leads', icon: <TeamOutlined />, label: '线索 CRM' },
        { key: '/funnel', icon: <FunnelPlotOutlined />, label: '转化漏斗' },
        { key: '/channels', icon: <PartitionOutlined />, label: '渠道管理' },
        { key: '/campaigns', icon: <ThunderboltOutlined />, label: '市场活动' },
        { key: '/group-buy', icon: <TagsOutlined />, label: '团购拼团' },
        { key: '/distribution', icon: <ShareAltOutlined />, label: '分销裂变' },
        { key: '/complaints', icon: <CustomerServiceOutlined />, label: '客诉管理' },
      ],
    },
    {
      key: 'sub-approval',
      icon: <AuditOutlined />,
      label: '审批协同',
      children: [
        { key: '/tasks', icon: <BellOutlined />, label: '待办中心' },
        { key: '/approvals', icon: <AuditOutlined />, label: '审批中心' },
        { key: '/approval-flows', icon: <AuditOutlined />, label: '审批流配置' },
      ],
    },
    {
      key: 'sub-system',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        { key: '/orgs', icon: <ApartmentOutlined />, label: '校区管理' },
        { key: '/users', icon: <UserOutlined />, label: '用户管理' },
        { key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色权限' },
        { key: '/notify-channels', icon: <ApiOutlined />, label: '消息渠道配置' },
        { key: '/reports', icon: <BarChartOutlined />, label: '看板配置/报表' },
        { key: '/tenants', icon: <ApiOutlined />, label: '租户中心' },
        { key: '/tenant-settings', icon: <SettingOutlined />, label: '机构设置' },
      ],
    },
  ];

  // 功能开关：显式为 false 的模块菜单对本机构全员隐藏（默认开启）
  const filterByFeature = (items: any[]): any[] =>
    items
      .filter((it) => {
        const fk = it.key ? MENU_KEY_TO_FEATURE[it.key] : undefined;
        if (fk && config?.features?.[fk] === false) return false;
        return true;
      })
      .map((it) => {
        if (it.children?.length) {
          const children = filterByFeature(it.children);
          return { ...it, children };
        }
        return it;
      })
      .filter((it) => !(it.children && it.children.length === 0));

  // 权限：机构设置仅 tenant:manage 可见
  const filterByPerm = (items: any[]): any[] =>
    items
      .filter((it) => !(it.key === '/tenant-settings' && !canManageTenant))
      .map((it) => (it.children?.length ? { ...it, children: filterByPerm(it.children) } : it));

  const visibleMenu = filterByPerm(filterByFeature(menuItems));

  // 找到当前选中项所属的一级子菜单 key（用于自动展开二级菜单）
  const findParentKey = (items: any[], key: string, trail: string[] = []): string | undefined => {
    for (const it of items) {
      if (it.key === key) return trail[trail.length - 1];
      if (it.children?.length) {
        const r = findParentKey(it.children, key, [...trail, it.key]);
        if (r !== undefined) return r;
      }
    }
    return undefined;
  };
  const parentKey = findParentKey(visibleMenu, selected);
  const [openKeys, setOpenKeys] = useState<string[]>(parentKey ? [parentKey] : []);
  useEffect(() => {
    if (parentKey) {
      setOpenKeys((prev) => (prev.includes(parentKey) ? prev : [...prev, parentKey]));
    }
  }, [parentKey]);

  const onLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {!isNarrow && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={208}
          trigger={null}
          style={{
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? 0 : '0 16px',
            }}
          >
            {config?.brand?.logo ? (
              <img
                src={config.brand.logo}
                alt="机构 Logo"
                style={{ height: 32, objectFit: 'contain' }}
              />
            ) : collapsed ? (
              <div style={{ fontWeight: 700, fontSize: 16 }}>机</div>
            ) : (
              <Typography.Title level={5} style={{ margin: 0 }}>
                机构管理系统
              </Typography.Title>
            )}
          </div>
          {/* 侧边栏独立滚动区：仅菜单内部滚动，不影响主体（高度 = 视口 - 顶部 logo - 底部折叠按钮） */}
          <div style={{ height: 'calc(100vh - 104px)', overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu
              mode="inline"
              selectedKeys={[selected]}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              items={visibleMenu}
              onClick={(e) => { if (e.key.startsWith('/')) navigate(e.key); }}
            />
          </div>
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开菜单' : '收起菜单'}
            style={{
              height: 48,
              borderRadius: 0,
              flexShrink: 0,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </Button>
        </Sider>
      )}

      {/* 移动端抽屉菜单：窄屏下 Sider 不渲染，用 Drawer 承载同一份菜单 */}
      <Drawer
        open={isNarrow && collapsed}
        onClose={() => setCollapsed(false)}
        placement="left"
        width={220}
        title="机构管理系统"
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={visibleMenu}
          onClick={(e) => { if (e.key.startsWith('/')) { navigate(e.key); setCollapsed(false); } }}
        />
      </Drawer>

      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: token.colorBgContainer,
            padding: '0 16px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          }}
        >
          {isNarrow && (
            <Button type="text" onClick={() => setCollapsed(!collapsed)}>
              菜单
            </Button>
          )}
          <Space wrap style={{ marginLeft: 'auto' }}>
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
                    <div style={{ color: token.colorTextSecondary }}>暂无未读通知</div>
                  )}
                  {noticeList.map((n) => (
                    <div key={n.id} style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div style={{ color: token.colorTextSecondary, fontSize: 12 }}>{n.content}</div>
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
            {/* 多校区切换器：切换后下发 X-Org-Id，全页以该校区视角隔离数据 */}
            <Select
              value={orgSel ?? 'ALL'}
              style={{ width: isNarrow ? 130 : 180 }}
              onChange={(v) => {
                const next = v === 'ALL' ? null : Number(v);
                setCurrentOrg(next);
                setOrgSel(next);
                setRefreshKey((k) => k + 1);
              }}
              options={
                profile?.orgIds?.length
                  ? campusOpts.filter((o) => profile.orgIds!.includes(o.value))
                  : [{ value: 'ALL', label: '全部校区(总校区)' }, ...campusOpts]
              }
            />
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
                  {profile?.tenantSlug ? (
                    <Tag color="geekblue">{profile.username}@{profile.tenantSlug}</Tag>
                  ) : null}
                  {profile?.roles?.length ? (
                    <Tag>{profile.roles.map((r: any) => r.name).join('/')}</Tag>
                  ) : null}
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        {/* 主体内容独立滚动：头部固定，仅内容区滚动 */}
        <Content style={{ flex: 1, height: 0, overflowY: 'auto', padding: 16 }}>
          <div key={refreshKey}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
