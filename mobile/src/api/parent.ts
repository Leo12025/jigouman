import { apiGet, apiPost, apiDelete } from './client';

/** 家长端接口（文档 §6.23 / §11.6） */

// 登录：发送/校验短信验证码
export const sendOtp = (phone: string) => apiPost<{ sent: boolean; code?: string }>('/parents/otp', { phone });
export const parentLogin = (phone: string, code: string) =>
  apiPost<{ accessToken: string; refreshToken: string; parent: any }>('/parents/login', { phone, code });

// 学员绑定（多对多）
export const myStudents = () => apiGet<any[]>('/parents/students');
export const bindStudent = (d: { studentId: number; parentName?: string; relation?: string }) =>
  apiPost<any>('/parents/bind', d);
export const unbindStudent = (bindId: number) => apiDelete(`/parents/bind/${bindId}`);

// 家长视角业务数据
export const myLessons = () => apiGet<any[]>('/parents/lessons');
export const myHomeworks = () => apiGet<any[]>('/parents/homeworks');
export const myReviews = () => apiGet<any[]>('/parents/reviews');
export const myConsumptions = () => apiGet<any[]>('/parents/consumptions');
export const myGrowth = (studentId: number) => apiGet<any[]>(`/parents/growth/${studentId}`);
export const myOrders = () => apiGet<any[]>('/parents/orders');
export const myNotices = () => apiGet<any[]>('/parents/notices');
export const myRenewals = () => apiGet<any[]>('/parents/renewals');

// 作业提交（§6.4，家长身份提交，后端校验绑定关系）
export const submitHomework = (homeworkId: number, d: { studentId: number; content?: string; files?: string[] }) =>
  apiPost<any>(`/homework/${homeworkId}/submit`, d);

// ---------- 家长端：客诉售后（§6.23 / §4.26） ----------
export const createComplaint = (d: any) => apiPost<any>('/complaints', d);
export const listComplaints = (params?: any) => apiGet<any>('/complaints', params);

// ---------- 家长端：合同查看（§4.23） ----------
export const listContracts = (params?: any) => apiGet<any>('/contracts', params);

// ---------- 家长端：团购核销（§4.24） ----------
export const redeemGroupBuy = (code: string) => apiPost<any>('/group-buy/redeem', { code });

// ---------- 家长端：转介绍（§4.28） ----------
export const createDistributor = (d: any) => apiPost<any>('/distribution/distributors', d);
export const listCommissions = (distributorId: number) =>
  apiGet<any[]>('/distribution/commissions', { distributorId });
