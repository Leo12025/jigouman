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

// 作业提交（§6.4，家长身份提交，后端校验绑定关系）
export const submitHomework = (homeworkId: number, d: { studentId: number; content?: string; files?: string[] }) =>
  apiPost<any>(`/homework/${homeworkId}/submit`, d);
