import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { getToken } from './api/client';
import MainLayout from './layouts/MainLayout';

const Login = lazy(() => import('./pages/Login'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LeadPage = lazy(() => import('./pages/LeadPage'));
const ChannelPage = lazy(() => import('./pages/ChannelPage'));
const CampaignPage = lazy(() => import('./pages/CampaignPage'));
const FunnelPage = lazy(() => import('./pages/FunnelPage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const ClassGroupPage = lazy(() => import('./pages/ClassGroupPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const StudentLifecyclePage = lazy(() => import('./pages/StudentLifecyclePage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const HourPage = lazy(() => import('./pages/HourPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const TaskPage = lazy(() => import('./pages/TaskPage'));
const HomeworkPage = lazy(() => import('./pages/HomeworkPage'));
const UserPage = lazy(() => import('./pages/UserPage'));
const RolePage = lazy(() => import('./pages/RolePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CampusOverviewPage = lazy(() => import('./pages/CampusOverviewPage'));
const BigScreenPage = lazy(() => import('./pages/BigScreenPage'));
const ApprovalFlowPage = lazy(() => import('./pages/ApprovalFlowPage'));
const ApprovalPage = lazy(() => import('./pages/ApprovalPage'));
const ClassChangePage = lazy(() => import('./pages/ClassChangePage'));
const ChannelConfigPage = lazy(() => import('./pages/ChannelConfigPage'));
const ComplaintPage = lazy(() => import('./pages/ComplaintPage'));
const ScorePage = lazy(() => import('./pages/ScorePage'));
const CoursePackagePage = lazy(() => import('./pages/CoursePackagePage'));
const PackageUpgradePage = lazy(() => import('./pages/PackageUpgradePage'));
const StoredValuePage = lazy(() => import('./pages/StoredValuePage'));
const CoursewarePage = lazy(() => import('./pages/CoursewarePage'));
const ResourcePage = lazy(() => import('./pages/ResourcePage'));
const EmployeePage = lazy(() => import('./pages/EmployeePage'));
const VenuePage = lazy(() => import('./pages/VenuePage'));
const CouponPage = lazy(() => import('./pages/CouponPage'));
const ContractPage = lazy(() => import('./pages/ContractPage'));
const MemberPage = lazy(() => import('./pages/MemberPage'));
const SurveyPage = lazy(() => import('./pages/SurveyPage'));
const AlertPage = lazy(() => import('./pages/AlertPage'));
const OrgPage = lazy(() => import('./pages/OrgPage'));
const InventoryCostPage = lazy(() => import('./pages/InventoryCostPage'));
const GroupBuyPage = lazy(() => import('./pages/GroupBuyPage'));
const DistributionPage = lazy(() => import('./pages/DistributionPage'));
const TeachingPage = lazy(() => import('./pages/TeachingPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const TenantPage = lazy(() => import('./pages/TenantPage'));
const TenantSettingsPage = lazy(() => import('./pages/TenantSettingsPage'));

/** 路由级代码分割：每个页面单独成 chunk，首屏只加载当前路由 */
const L = (Comp: React.ComponentType) => (
  <Suspense
    fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    }
  >
    <Comp />
  </Suspense>
);

function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={L(Login)} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={L(HomePage)} />
        <Route path="courses" element={L(CoursePage)} />
        <Route path="class-groups" element={L(ClassGroupPage)} />
        <Route path="lessons" element={L(LessonPage)} />
        <Route path="students" element={L(StudentPage)} />
        <Route path="students/:id/lifecycle" element={L(StudentLifecyclePage)} />
        <Route path="orders" element={L(OrderPage)} />
        <Route path="hours" element={L(HourPage)} />
        <Route path="finance" element={L(FinancePage)} />
        <Route path="tasks" element={L(TaskPage)} />
        <Route path="homework" element={L(HomeworkPage)} />
        <Route path="dashboard" element={L(DashboardPage)} />
        <Route path="campus-overview" element={L(CampusOverviewPage)} />
        <Route path="big-screen" element={L(BigScreenPage)} />
        <Route path="leads" element={L(LeadPage)} />
        <Route path="channels" element={L(ChannelPage)} />
        <Route path="campaigns" element={L(CampaignPage)} />
        <Route path="funnel" element={L(FunnelPage)} />
        <Route path="users" element={L(UserPage)} />
        <Route path="roles" element={L(RolePage)} />
        <Route path="approval-flows" element={L(ApprovalFlowPage)} />
        <Route path="approvals" element={L(ApprovalPage)} />
        <Route path="class-change" element={L(ClassChangePage)} />
        <Route path="notify-channels" element={L(ChannelConfigPage)} />
        <Route path="complaints" element={L(ComplaintPage)} />
        <Route path="scores" element={L(ScorePage)} />
        <Route path="course-packages" element={L(CoursePackagePage)} />
        <Route path="package-upgrades" element={L(PackageUpgradePage)} />
        <Route path="stored-value" element={L(StoredValuePage)} />
        <Route path="coursewares" element={L(CoursewarePage)} />
        <Route path="resources" element={L(ResourcePage)} />
        <Route path="employees" element={L(EmployeePage)} />
        <Route path="classrooms" element={L(VenuePage)} />
        <Route path="coupons" element={L(CouponPage)} />
        <Route path="contracts" element={L(ContractPage)} />
        <Route path="members" element={L(MemberPage)} />
        <Route path="surveys" element={L(SurveyPage)} />
        <Route path="alerts" element={L(AlertPage)} />
        <Route path="orgs" element={L(OrgPage)} />
        <Route path="inventory" element={L(InventoryCostPage)} />
        <Route path="group-buy" element={L(GroupBuyPage)} />
        <Route path="distribution" element={L(DistributionPage)} />
        <Route path="teaching" element={L(TeachingPage)} />
        <Route path="reports" element={L(ReportPage)} />
        <Route path="tenants" element={L(TenantPage)} />
        <Route path="tenant-settings" element={L(TenantSettingsPage)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
