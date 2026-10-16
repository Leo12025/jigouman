import { apiGet } from './client';

/** 数据看板（M6，文档 §4.10 / §6.7）：GET /api/v1/dashboards/{role} */
export const getDashboard = (role: 'principal' | 'admission' | 'teaching', params?: any) =>
  apiGet<any>(`/dashboards/${role}`, params || {});

/** 数据大屏总览：GET /api/v1/dashboards/screen */
export const getDashboardScreen = () => apiGet<any>(`/dashboards/screen`);

/** 总校区视角·跨校区汇总对比：GET /api/v1/dashboards/campus-overview */
export const getCampusOverview = () => apiGet<any>('/dashboards/campus-overview');

/** AI 经营诊断（§11.8，低风险只读辅助，需人工判断） */
export const getAiDiagnose = () => apiGet<any>('/dashboards/ai-diagnose');
