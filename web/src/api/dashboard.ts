import { apiGet } from './client';

/** 数据看板（M6，文档 §4.10 / §6.7）：GET /api/v1/dashboards/{role} */
export const getDashboard = (role: 'principal' | 'admission' | 'teaching', params?: any) =>
  apiGet<any>(`/dashboards/${role}`, params || {});
