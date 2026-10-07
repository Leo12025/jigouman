import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import LeadPage from './pages/LeadPage';
import ChannelPage from './pages/ChannelPage';
import CampaignPage from './pages/CampaignPage';
import FunnelPage from './pages/FunnelPage';

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
        <Route index element={<Navigate to="/leads" replace />} />
        <Route path="leads" element={<LeadPage />} />
        <Route path="channels" element={<ChannelPage />} />
        <Route path="campaigns" element={<CampaignPage />} />
        <Route path="funnel" element={<FunnelPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
