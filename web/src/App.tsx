import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import LeadPage from './pages/LeadPage';
import ChannelPage from './pages/ChannelPage';
import CampaignPage from './pages/CampaignPage';
import FunnelPage from './pages/FunnelPage';
import CoursePage from './pages/CoursePage';
import ClassGroupPage from './pages/ClassGroupPage';
import LessonPage from './pages/LessonPage';
import StudentPage from './pages/StudentPage';
import OrderPage from './pages/OrderPage';
import HourPage from './pages/HourPage';
import FinancePage from './pages/FinancePage';
import TaskPage from './pages/TaskPage';
import HomeworkPage from './pages/HomeworkPage';
import UserPage from './pages/UserPage';
import RolePage from './pages/RolePage';
import DashboardPage from './pages/DashboardPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursePage />} />
        <Route path="class-groups" element={<ClassGroupPage />} />
        <Route path="lessons" element={<LessonPage />} />
        <Route path="students" element={<StudentPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="hours" element={<HourPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="tasks" element={<TaskPage />} />
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leads" element={<LeadPage />} />
        <Route path="channels" element={<ChannelPage />} />
        <Route path="campaigns" element={<CampaignPage />} />
        <Route path="funnel" element={<FunnelPage />} />
        <Route path="users" element={<UserPage />} />
        <Route path="roles" element={<RolePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
