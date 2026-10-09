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

// ---------- 订单与财务 (M4) ----------
export const listOrders = (params: any) => apiGet<PageResult<any>>('/orders', params);
export const getOrder = (id: number) => apiGet<any>(`/orders/${id}`);
export const createOrder = (d: any) => apiPost<any>('/orders', d);
export const payOrder = (id: number, d: any) => apiPost<any>(`/orders/${id}/pay`, d);
export const refundOrder = (id: number, d: any) => apiPost<any>(`/orders/${id}/refund`, d);
export const approveRefund = (id: number, refundId: number) =>
  apiPost<any>(`/orders/${id}/refund/${refundId}/approve`);
export const previewRefund = (id: number) =>
  apiGet<any>(`/orders/${id}/refund-preview`);

// ---------- 课时管理 (M4) ----------
export const getStudentHours = (studentId: number) =>
  apiGet<any[]>(`/students/${studentId}/hours`);
export const listHourAccounts = (params: any) => apiGet<PageResult<any>>('/hour-accounts', params);
export const listHourConsumptions = (params: any) =>
  apiGet<PageResult<any>>('/hour-consumptions', params);
export const grantHours = (d: any) => apiPost<any>('/hour-accounts/grant', d);
export const attendLesson = (lessonId: number, d: any) =>
  apiPost<any>(`/lessons/${lessonId}/attendance`, d);
export const leaveLesson = (lessonId: number, d: any) =>
  apiPost<any>(`/lessons/${lessonId}/leave`, d);
export const listClassGroupStudents = (classGroupId: number) =>
  apiGet<{ id: number; name: string }[]>(`/students/by-class-group/${classGroupId}`);

// ---------- 财务 (§4.5) ----------
export const getSplitConfig = () => apiGet<any>('/finance/split-config');
export const upsertSplitConfig = (d: any) => apiPut<any>('/finance/split-config', d);
export const listSplits = (params: any) => apiGet<PageResult<any>>('/finance/splits', params);
export const settleSplits = (d: any) => apiPost<any>('/finance/splits/settle', d);
export const generateSalary = (d: any) => apiPost<any>('/finance/salary/generate', d);
export const listSalary = (params: any) => apiGet<PageResult<any>>('/finance/salary', params);
export const confirmSalary = (id: number) => apiPut<any>(`/finance/salary/${id}/confirm`);
export const paySalary = (id: number) => apiPut<any>(`/finance/salary/${id}/pay`);
export const applyInvoice = (d: any) => apiPost<any>('/finance/invoices', d);
export const issueInvoice = (id: number) => apiPut<any>(`/finance/invoices/${id}/issue`);
export const listInvoices = (params: any) => apiGet<PageResult<any>>('/finance/invoices', params);
export const getInvoice = (id: number) => apiGet<any>(`/finance/invoices/${id}`);
export const financeSummary = (params: any) => apiGet<any>('/finance/summary', params);

// ---------- 待办中心 (§4.26) ----------
export const listTasks = (params: any) => apiGet<PageResult<any>>('/tasks', params);
export const getMyTodos = (params: any) => apiGet<PageResult<any>>('/tasks/todos', params);
export const getTaskStats = () => apiGet<any>('/tasks/stats');
export const createTask = (d: any) => apiPost<any>('/tasks', d);
export const completeTask = (id: number) => apiPut<any>(`/tasks/${id}/complete`);
export const removeTask = (id: number) => apiDelete(`/tasks/${id}`);

export const TASK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  AFTER_CLASS_REVIEW: { label: '课后点评', color: 'gold' },
  HOMEWORK_REVIEW: { label: '作业批改', color: 'blue' },
  SCORE_ENTRY: { label: '成绩录入', color: 'purple' },
  ATTENDANCE: { label: '点名消课', color: 'cyan' },
  COMPLAINT: { label: '客诉处理', color: 'red' },
  APPROVAL: { label: '审批', color: 'magenta' },
};

// ---------- 通知中心 (§4.26 提醒推送) ----------
export const getNotifications = (params: any) =>
  apiGet<PageResult<any>>('/notifications', params);
export const getUnreadCount = () => apiGet<{ count: number }>('/notifications/unread-count');
export const markNotificationRead = (id: number) =>
  apiPut<any>(`/notifications/${id}/read`);
export const markAllNotificationsRead = () =>
  apiPut<any>('/notifications/read-all');

// ---------- 审批中心 (§4.16 / §4.26 审批接入) ----------
export const createApproval = (d: any) => apiPost<any>('/approvals', d);
export const approveApproval = (id: number, comment?: string) =>
  apiPost<any>(`/approvals/${id}/approve`, { comment });
export const rejectApproval = (id: number, comment?: string) =>
  apiPost<any>(`/approvals/${id}/reject`, { comment });
export const listApprovals = (params: any) => apiGet<PageResult<any>>('/approvals', params);
export const myApprovals = () => apiGet<any>('/approvals/todos');

// ---------- 补课排课 (§4.6) ----------
export const scheduleMakeup = (d: any) => apiPost<any>('/lessons/makeup', d);

// ---------- 作业 (§4.7) ----------
export const createHomework = (d: any) => apiPost<any>('/homework', d);
export const listHomeworks = (params: any) => apiGet<PageResult<any>>('/homework', params);
export const getHomework = (id: number) => apiGet<any>(`/homework/${id}`);
export const submitHomework = (id: number, d: any) => apiPost<any>(`/homework/${id}/submit`, d);
export const reviewHomework = (submitId: number, d: any) => apiPost<any>(`/homework/submit/${submitId}/review`, d);
export const listHomeworkSubmits = (params: any) => apiGet<PageResult<any>>('/homework/submits/list', params);
export const homeworkStats = (id: number) => apiGet<any>(`/homework/${id}/stats`);
export const homeworkUnsubmitted = (id: number) => apiGet<any[]>(`/homework/${id}/unsubmitted`);

// ---------- 家校点评 (§6.6) ----------
export const createCourseReview = (d: any) => apiPost<any>('/course-reviews', d);
export const listStudentReviews = (studentId: number, params?: any) =>
  apiGet<PageResult<any>>(`/students/${studentId}/reviews`, params);

