import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import { getToken, getRole } from './api/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';

// 家长端
import PStudents from './pages/parent/StudentsPage';
import PLessons from './pages/parent/LessonsPage';
import PHomework from './pages/parent/HomeworkPage';
import PReviews from './pages/parent/ReviewsPage';
import PMe from './pages/parent/MePage';
import PConsumptions from './pages/parent/ConsumptionsPage';
import PGrowth from './pages/parent/GrowthPage';
import POrders from './pages/parent/OrdersPage';
import PNotices from './pages/parent/NoticesPage';
import PService from './pages/parent/ServicePage';

// 老师端
import TTasks from './pages/teacher/TasksPage';
import TLessons from './pages/teacher/LessonsPage';
import THomework from './pages/teacher/HomeworkPage';
import TScores from './pages/teacher/ScoresPage';
import TReviews from './pages/teacher/ReviewsPage';
import TSchedule from './pages/teacher/SchedulePage';

// 顾问端
import CLeads from './pages/consultant/LeadsPage';
import CTrials from './pages/consultant/TrialsPage';
import CFunnel from './pages/consultant/FunnelPage';
import CMarketing from './pages/consultant/MarketingPage';
import './index.css';

/** 登录守卫：未登录跳登录页；已登录但角色不匹配则跳回该角色首页 */
function Guard({ role, children }: { role: 'parent' | 'teacher' | 'consultant'; children: React.ReactElement }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (getRole() !== role) {
    const home = getRole() === 'parent' ? '/p/students' : getRole() === 'teacher' ? '/t/tasks' : '/c/leads';
    return <Navigate to={home} replace />;
  }
  return children;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* 家长端 */}
            <Route path="/p/students" element={<Guard role="parent"><PStudents /></Guard>} />
            <Route path="/p/lessons" element={<Guard role="parent"><PLessons /></Guard>} />
            <Route path="/p/homework" element={<Guard role="parent"><PHomework /></Guard>} />
            <Route path="/p/reviews" element={<Guard role="parent"><PReviews /></Guard>} />
            <Route path="/p/me" element={<Guard role="parent"><PMe /></Guard>} />
            <Route path="/p/consumptions" element={<Guard role="parent"><PConsumptions /></Guard>} />
            <Route path="/p/growth" element={<Guard role="parent"><PGrowth /></Guard>} />
            <Route path="/p/orders" element={<Guard role="parent"><POrders /></Guard>} />
            <Route path="/p/notices" element={<Guard role="parent"><PNotices /></Guard>} />
            <Route path="/p/service" element={<Guard role="parent"><PService /></Guard>} />
            {/* 老师端 */}
            <Route path="/t/tasks" element={<Guard role="teacher"><TTasks /></Guard>} />
            <Route path="/t/lessons" element={<Guard role="teacher"><TLessons /></Guard>} />
            <Route path="/t/homework" element={<Guard role="teacher"><THomework /></Guard>} />
            <Route path="/t/scores" element={<Guard role="teacher"><TScores /></Guard>} />
            <Route path="/t/reviews" element={<Guard role="teacher"><TReviews /></Guard>} />
            <Route path="/t/schedule" element={<Guard role="teacher"><TSchedule /></Guard>} />
            {/* 顾问端 */}
            <Route path="/c/leads" element={<Guard role="consultant"><CLeads /></Guard>} />
            <Route path="/c/trials" element={<Guard role="consultant"><CTrials /></Guard>} />
            <Route path="/c/funnel" element={<Guard role="consultant"><CFunnel /></Guard>} />
            <Route path="/c/marketing" element={<Guard role="consultant"><CMarketing /></Guard>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
