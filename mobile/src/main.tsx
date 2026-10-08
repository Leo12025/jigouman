import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd-mobile';
import zhCN from 'antd-mobile/es/locales/zh-CN';
import { getToken } from './api/client';
import LoginPage from './pages/LoginPage';
import StudentsPage from './pages/StudentsPage';
import LessonsPage from './pages/LessonsPage';
import HomeworkPage from './pages/HomeworkPage';
import ReviewsPage from './pages/ReviewsPage';
import './index.css';

/** 登录守卫：未登录跳登录页 */
function Guard({ children }: { children: React.ReactElement }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><StudentsPage /></Guard>} />
          <Route path="/lessons" element={<Guard><LessonsPage /></Guard>} />
          <Route path="/homework" element={<Guard><HomeworkPage /></Guard>} />
          <Route path="/reviews" element={<Guard><ReviewsPage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
