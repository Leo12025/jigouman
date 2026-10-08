import { TabBar } from 'antd-mobile';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { key: '/', title: '学员' },
  { key: '/lessons', title: '课表' },
  { key: '/homework', title: '作业' },
  { key: '/reviews', title: '点评' },
];

/** 家长端底部导航（§11.6 移动端信息架构） */
export default function BottomTab() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', zIndex: 10 }}>
      <TabBar activeKey={location.pathname} onChange={(key) => navigate(key)}>
        {TABS.map((t) => (
          <TabBar.Item key={t.key} title={t.title} />
        ))}
      </TabBar>
    </div>
  );
}
