import { apiPost, apiGet, apiPut, apiDelete, setTokens } from './client';
import type {
  Channel,
  Campaign,
  Lead,
  LeadFollow,
  TrialLesson,
  Funnel,
  PageResult,
  RoleInfo,
  PermissionInfo,
  UserInfo,
} from './types';

// ---------- 鉴权 ----------
export const login = (username: string, password: string) =>
  apiPost<{ accessToken: string; refreshToken: string; user: UserInfo }>('/auth/login', {
    username,
    password,
  });

export const fetchProfile = () =>
  apiGet<{ id: number; username: string; name?: string; tenantId: number; roles: RoleInfo[]; permissions: string[]; orgName: string }>(
    '/auth/profile',
  );

/** 登录并落地双令牌 */
export async function loginAndStore(username: string, password: string) {
  const res = await login(username, password);
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

// ---------- 渠道 ----------
export const listChannels = () => apiGet<Channel[]>('/channels');
export const createChannel = (d: any) => apiPost<Channel>('/channels', d);
export const updateChannel = (id: number, d: any) => apiPut<Channel>(`/channels/${id}`, d);
export const deleteChannel = (id: number) => apiDelete(`/channels/${id}`);

// ---------- 活动 ----------
export const listCampaigns = () => apiGet<Campaign[]>('/campaigns');
export const createCampaign = (d: any) => apiPost<Campaign>('/campaigns', d);
export const updateCampaign = (id: number, d: any) => apiPut<Campaign>(`/campaigns/${id}`, d);
export const deleteCampaign = (id: number) => apiDelete(`/campaigns/${id}`);

// ---------- 线索 ----------
export const listLeads = (params: any) => apiGet<PageResult<Lead>>('/leads', params);
export const getLead = (id: number) => apiGet<Lead>(`/leads/${id}`);
export const createLead = (d: any) => apiPost<Lead>('/leads', d);
export const updateLead = (id: number, d: any) => apiPut<Lead>(`/leads/${id}`, d);
export const deleteLead = (id: number) => apiDelete(`/leads/${id}`);
export const assignLead = (id: number, ownerId: number) =>
  apiPost<Lead>(`/leads/${id}/assign`, { ownerId });
export const followLead = (id: number, d: any) => apiPost<LeadFollow>(`/leads/${id}/follow`, d);
export const convertLead = (id: number, d: any) =>
  apiPost<{ leadId: number; studentId: number; already: boolean }>(`/leads/${id}/convert`, d);
export const createTrial = (id: number, d: any) => apiPost<TrialLesson>(`/leads/${id}/trials`, d);
export const listTrials = (id: number) => apiGet<TrialLesson[]>(`/leads/${id}/trials`);
export const listFollows = (id: number) => apiGet<LeadFollow[]>(`/leads/${id}/follows`);
export const getFunnel = (params: any) => apiGet<Funnel>('/leads/funnel', params);

// ---------- 课程 / 班级 / 课次 ----------
export const listCourseCategories = () => apiGet<any[]>('/courses/categories');
export const createCourseCategory = (d: any) => apiPost<any>('/courses/categories', d);
export const updateCourseCategory = (id: number, d: any) => apiPut<any>(`/courses/categories/${id}`, d);
export const deleteCourseCategory = (id: number) => apiDelete(`/courses/categories/${id}`);

export const listCourses = (params: any) => apiGet<PageResult<any>>('/courses', params);
export const createCourse = (d: any) => apiPost<any>('/courses', d);
export const updateCourse = (id: number, d: any) => apiPut<any>(`/courses/${id}`, d);
export const deleteCourse = (id: number) => apiDelete(`/courses/${id}`);

export const listClassGroups = (params: any) => apiGet<PageResult<any>>('/courses/class-groups/list', params);
export const getClassGroup = (id: number) => apiGet<any>(`/courses/class-groups/${id}`);
export const createClassGroup = (d: any) => apiPost<any>('/courses/class-groups', d);
export const updateClassGroup = (id: number, d: any) => apiPut<any>(`/courses/class-groups/${id}`, d);
export const deleteClassGroup = (id: number) => apiDelete(`/courses/class-groups/${id}`);

export const listLessons = (params: any) => apiGet<PageResult<any>>('/courses/lessons/list', params);
export const createLesson = (d: any) => apiPost<any>('/courses/lessons', d);
export const updateLesson = (id: number, d: any) => apiPut<any>(`/courses/lessons/${id}`, d);
export const deleteLesson = (id: number) => apiDelete(`/courses/lessons/${id}`);
export const generateLessons = (d: any) =>
  apiPost<{ createdCount: number; skippedCount: number; created: any[]; skipped: any[] }>(
    '/courses/lessons/generate',
    d,
  );

// ---------- 学员 ----------
export const listStudents = (params: any) => apiGet<PageResult<any>>('/students', params);
export const getStudent = (id: number) => apiGet<any>(`/students/${id}`);
export const createStudent = (d: any) => apiPost<any>('/students', d);
export const updateStudent = (id: number, d: any) => apiPut<any>(`/students/${id}`, d);
export const deleteStudent = (id: number) => apiDelete(`/students/${id}`);
export const bindParent = (d: any) => apiPost<any>('/students/parents/bind', d);
export const unbindParent = (d: any) => apiPost<any>('/students/parents/unbind', d);
export const enrollCourse = (d: any) => apiPost<any>('/students/courses/enroll', d);

// ---------- 系统管理 ----------
export const listUsers = (params: any) => apiGet<PageResult<any>>('/users', params);
export const createUser = (d: any) => apiPost<any>('/users', d);
export const updateUser = (id: number, d: any) => apiPut<any>(`/users/${id}`, d);
export const resetUserPassword = (id: number, password: string) =>
  apiPost<any>(`/users/${id}/reset-password`, { password });
export const deleteUser = (id: number) => apiDelete(`/users/${id}`);

export const listRoles = () => apiGet<any[]>('/roles');
export const createRole = (d: any) => apiPost<any>('/roles', d);
export const updateRole = (id: number, d: any) => apiPut<any>(`/roles/${id}`, d);
export const deleteRole = (id: number) => apiDelete(`/roles/${id}`);

export const listPermissions = () => apiGet<PermissionInfo[]>('/permissions');
