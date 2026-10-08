import { apiGet, apiPost, apiPut } from './client';

/** 老师端 / 顾问端接口（staff 身份，账号密码登录） */

// ---------- 登录 ----------
export const staffLogin = (username: string, password: string) =>
  apiPost<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { username, password });
export const staffProfile = () => apiGet<any>('/auth/profile');

// ---------- 老师端（§11.6） ----------
/** 待办中心：点评/批改/成绩/点名等逾期聚合提醒 */
export const listTasks = (params?: any) => apiGet<any>('/tasks', params);
export const completeTask = (id: number) => apiPut(`/tasks/${id}/complete`);

/** 班级课表 */
export const listLessons = (params?: any) => apiGet<any>('/courses/lessons/list', params);
export const listClassGroups = (params?: any) => apiGet<any>('/courses/class-groups/list', params);
/** 班级在读学员（点名用） */
export const classGroupStudents = (id: number) => apiGet<any[]>(`/students/by-class-group/${id}`);
/** 点名消课 */
export const attendLesson = (lessonId: number, records: { studentId: number; status: string }[]) =>
  apiPost<any>(`/lessons/${lessonId}/attendance`, { records });

/** 作业批改 */
export const listHomeworks = (params?: any) => apiGet<any>('/homework', params);
export const getHomework = (id: number) => apiGet<any>(`/homework/${id}`);
export const reviewHomework = (submitId: number, d: any) =>
  apiPost<any>(`/homework/submit/${submitId}/review`, d);

/** 课后点评 */
export const createCourseReview = (d: any) => apiPost<any>('/course-reviews', d);

/** 成绩录入 */
export const listExams = () => apiGet<any[]>('/exams');
export const createScore = (d: any) => apiPost<any>('/scores', d);

// ---------- 顾问端（§11.6，可选） ----------
export const listLeads = (params?: any) => apiGet<any>('/leads', params);
export const followLead = (id: number, d: any) => apiPost<any>(`/leads/${id}/follow`, d);
export const listTrials = (id: number) => apiGet<any[]>(`/leads/${id}/trials`);
export const createTrial = (id: number, d: any) => apiPost<any>(`/leads/${id}/trials`, d);
export const convertLead = (id: number, d?: any) => apiPost<any>(`/leads/${id}/convert`, d);
export const getFunnel = () => apiGet<any>('/leads/funnel');
