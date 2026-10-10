import { TabBar } from 'antd-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRole, type Role } from '../api/client';

/** 各角色底部导航（文档 §11.6 移动端信息架构） */
const TABS: Record<Role, { key: string; title: string }[]> = {
  parent: [
    { key: '/p/students', title: '学员' },
    { key: '/p/lessons', title: '课表' },
    { key: '/p/homework', title: '作业' },
    { key: '/p/reviews', title: '点评' },
    { key: '/p/me', title: '我的' },
    { key: '/p/service', title: '服务' },
  ],
  teacher: [
    { key: '/t/tasks', title: '待办' },
    { key: '/t/lessons', title: '课表' },
    { key: '/t/homework', title: '批改' },
    { key: '/t/scores', title: '成绩' },
    { key: '/t/reviews', title: '点评' },
    { key: '/t/schedule', title: '排班' },
  ],
  consultant: [
    { key: '/c/leads', title: '线索' },
    { key: '/c/trials', title: '试听' },
    { key: '/c/funnel', title: '漏斗' },
    { key: '/c/marketing', title: '营销' },
  ],
};

export default function BottomTab() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRole();
  const tabs = TABS[role] || TABS.parent;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', zIndex: 10 }}>
      <TabBar activeKey={location.pathname} onChange={(key) => navigate(key)}>
        {tabs.map((t) => (
          <TabBar.Item key={t.key} title={t.title} />
        ))}
      </TabBar>
    </div>
  );
}
