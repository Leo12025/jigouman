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
import StudentLifecyclePage from './pages/StudentLifecyclePage';
import OrderPage from './pages/OrderPage';
import HourPage from './pages/HourPage';
import FinancePage from './pages/FinancePage';
import TaskPage from './pages/TaskPage';
import HomeworkPage from './pages/HomeworkPage';
import UserPage from './pages/UserPage';
import RolePage from './pages/RolePage';
import DashboardPage from './pages/DashboardPage';
import ApprovalFlowPage from './pages/ApprovalFlowPage';
import ChannelConfigPage from './pages/ChannelConfigPage';
import ComplaintPage from './pages/ComplaintPage';
import ScorePage from './pages/ScorePage';
import CoursePackagePage from './pages/CoursePackagePage';
import CoursewarePage from './pages/CoursewarePage';
import ResourcePage from './pages/ResourcePage';
import EmployeePage from './pages/EmployeePage';
import VenuePage from './pages/VenuePage';
import CouponPage from './pages/CouponPage';
import ContractPage from './pages/ContractPage';
import MemberPage from './pages/MemberPage';
import SurveyPage from './pages/SurveyPage';
import AlertPage from './pages/AlertPage';
import OrgPage from './pages/OrgPage';
import InventoryCostPage from './pages/InventoryCostPage';
import GroupBuyPage from './pages/GroupBuyPage';
import DistributionPage from './pages/DistributionPage';
import TeachingPage from './pages/TeachingPage';
import ReportPage from './pages/ReportPage';

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
        <Route path="students/:id/lifecycle" element={<StudentLifecyclePage />} />
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
        <Route path="approval-flows" element={<ApprovalFlowPage />} />
        <Route path="notify-channels" element={<ChannelConfigPage />} />
        <Route path="complaints" element={<ComplaintPage />} />
        <Route path="scores" element={<ScorePage />} />
        <Route path="course-packages" element={<CoursePackagePage />} />
        <Route path="coursewares" element={<CoursewarePage />} />
        <Route path="resources" element={<ResourcePage />} />
        <Route path="employees" element={<EmployeePage />} />
        <Route path="classrooms" element={<VenuePage />} />
        <Route path="coupons" element={<CouponPage />} />
        <Route path="contracts" element={<ContractPage />} />
        <Route path="members" element={<MemberPage />} />
        <Route path="surveys" element={<SurveyPage />} />
        <Route path="alerts" element={<AlertPage />} />
        <Route path="orgs" element={<OrgPage />} />
        <Route path="inventory" element={<InventoryCostPage />} />
        <Route path="group-buy" element={<GroupBuyPage />} />
        <Route path="distribution" element={<DistributionPage />} />
        <Route path="teaching" element={<TeachingPage />} />
        <Route path="reports" element={<ReportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
