import { apiPost, apiGet, apiPut, apiDelete, setTokens, downloadFile } from './client';
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
export const getStudentLifecycle = (id: number) => apiGet<any>(`/students/${id}/lifecycle`);

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
export const previewRefund = (id: number) =>
  apiGet<any>(`/orders/${id}/refund-preview`);

// ---------------- 审批中心（§4.16，资金联动退款/转班/调课均在此终审） ----------------
export const myApprovalTodos = () => apiGet<any[]>('/approvals/todos');
export const getApproval = (id: number) => apiGet<any>(`/approvals/${id}`);

// ---------------- 调课/转班（资金联动，走审批中心） ----------------
export const createTransfer = (d: any) => apiPost<any>('/class-change/transfers', d);
export const listTransfers = (params: any) => apiGet<any>('/class-change/transfers', params);
export const createReschedule = (d: any) => apiPost<any>('/class-change/reschedules', d);
export const listReschedules = (params: any) => apiGet<any>('/class-change/reschedules', params);

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

// 外部消息渠道配置 (§4.26 多渠道提醒：腾讯云/阿里云短信、微信，管理员填密钥即用)
export const listNotifyChannels = () => apiGet<any[]>('/notifications/channels');
export const upsertNotifyChannel = (d: any) => apiPut<any>('/notifications/channels', d);
export const deleteNotifyChannel = (type: string) =>
  apiDelete(`/notifications/channels/${type}`);

// ---------- 审批中心 (§4.16 / §4.26 审批接入) ----------
export const createApproval = (d: any) => apiPost<any>('/approvals', d);
export const approveApproval = (id: number, comment?: string) =>
  apiPost<any>(`/approvals/${id}/approve`, { comment });
export const rejectApproval = (id: number, comment?: string) =>
  apiPost<any>(`/approvals/${id}/reject`, { comment });
export const listApprovals = (params: any) => apiGet<PageResult<any>>('/approvals', params);
export const myApprovals = () => apiGet<any>('/approvals/todos');

// 审批流模板配置 (§4.16 增强：可视化节点/审批人)
export const listApprovalFlows = (params: any) =>
  apiGet<PageResult<any>>('/approvals/flows', params);
export const getApprovalFlow = (id: number) => apiGet<any>(`/approvals/flows/${id}`);
export const createApprovalFlow = (d: any) => apiPost<any>('/approvals/flows', d);
export const updateApprovalFlow = (id: number, d: any) => apiPut<any>(`/approvals/flows/${id}`, d);
export const deleteApprovalFlow = (id: number) => apiDelete(`/approvals/flows/${id}`);
// 审批人选择器：拉取全部用户（角色/用户节点共用）
export const listAllUsers = (params: any = {}) =>
  apiGet<PageResult<any>>('/users', { size: 200, ...params });

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

// ---------- 客诉管理 (§4.26 客诉分派→COMPLAINT 待办) ----------
export const listComplaints = (params: any) => apiGet<any>('/complaints', params);
export const createComplaint = (d: any) => apiPost<any>('/complaints', d);
export const assignComplaint = (id: number, assigneeId: number) =>
  apiPut<any>(`/complaints/${id}/assign`, { assigneeId });
export const resolveComplaint = (id: number, resolution: string) =>
  apiPost<any>(`/complaints/${id}/resolve`, { resolution });

// ---------- 学员成长 / 成绩 (§6.5 测评→成绩录入) ----------
export const listExams = () => apiGet<any[]>('/exams');
export const createExam = (d: any) => apiPost<any>('/exams', d);
export const listScores = (params: any) => apiGet<any[]>('/scores', params);
export const createScore = (d: any) => apiPost<any>('/scores', d);

// ---------- 统一资源 (§4.1 本地/OSS 可配置) ----------
/** 上传文件（多文件），返回 Resource[] */
export const uploadResources = (
  files: File[],
  opts?: { category?: string; refType?: string; refId?: number },
) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const qs = new URLSearchParams();
  if (opts?.category) qs.set('category', opts.category);
  if (opts?.refType) qs.set('refType', opts.refType);
  if (opts?.refId) qs.set('refId', String(opts.refId));
  const q = qs.toString();
  return apiPost<any[]>(`/resources/upload${q ? `?${q}` : ''}`, fd);
};
export const listResources = (params: any) => apiGet<PageResult<any>>('/resources', params);
export const deleteResource = (id: number) => apiDelete(`/resources/${id}`);

// ---------- 课包（售卖套餐 / 课时维度） ----------
export const listCoursePackages = (params: any) => apiGet<any>('/course-packages', params);
export const createCoursePackage = (d: any) => apiPost<any>('/course-packages', d);
export const updateCoursePackage = (id: number, d: any) => apiPut<any>(`/course-packages/${id}`, d);
export const deleteCoursePackage = (id: number) => apiDelete(`/course-packages/${id}`);
export const listPackageCourses = (id: number) => apiGet<any[]>(`/course-packages/${id}/courses`);
export const addPackageCourses = (id: number, courseIds: number[]) =>
  apiPost<any[]>(`/course-packages/${id}/courses`, { courseIds });
export const removePackageCourse = (id: number, courseId: number) =>
  apiDelete(`/course-packages/${id}/courses/${courseId}`);
export const purchaseCoursePackage = (id: number, d: { studentId: number; hours?: number }) =>
  apiPost<any>(`/course-packages/${id}/purchase`, d);

// ---------- 课件（课程→阶段→课时课件） ----------
export const listStages = (courseId: number) => apiGet<any[]>(`/courses/${courseId}/stages`);
export const createStage = (courseId: number, d: any) =>
  apiPost<any>(`/courses/${courseId}/stages`, d);
export const updateStage = (id: number, d: any) => apiPut<any>(`/stages/${id}`, d);
export const deleteStage = (id: number) => apiDelete(`/stages/${id}`);
export const listStageCoursewares = (stageId: number, params?: any) =>
  apiGet<any>(`/stages/${stageId}/coursewares`, params);
export const createCourseware = (stageId: number, d: any) =>
  apiPost<any>(`/stages/${stageId}/coursewares`, d);
export const updateCourseware = (id: number, d: any) => apiPut<any>(`/coursewares/${id}`, d);
export const deleteCourseware = (id: number) => apiDelete(`/coursewares/${id}`);

// ---------- 师资员工 (§4.14) ----------
export const listEmployees = (params: any) => apiGet<PageResult<any>>('/employees', params);
export const createEmployee = (d: any) => apiPost<any>('/employees', d);
export const updateEmployee = (id: number, d: any) => apiPut<any>(`/employees/${id}`, d);
export const deleteEmployee = (id: number) => apiDelete(`/employees/${id}`);
export const upsertTeacherProfile = (id: number, d: any) =>
  apiPut<any>(`/employees/${id}/teacher-profile`, d);
export const listCertificates = (id: number) =>
  apiGet<any[]>(`/employees/${id}/certificates`);
export const addCertificate = (id: number, d: any) =>
  apiPost<any>(`/employees/${id}/certificates`, d);
export const updateCertificate = (cid: number, d: any) =>
  apiPut<any>(`/employees/certificates/${cid}`, d);
export const deleteCertificate = (cid: number) =>
  apiDelete(`/employees/certificates/${cid}`);

// ---------- 教室场地 (§4.15) ----------
export const listClassrooms = (params: any) => apiGet<PageResult<any>>('/classrooms', params);
export const createClassroom = (d: any) => apiPost<any>('/classrooms', d);
export const updateClassroom = (id: number, d: any) => apiPut<any>(`/classrooms/${id}`, d);
export const deleteClassroom = (id: number) => apiDelete(`/classrooms/${id}`);

// ---------- 优惠券 (§4.17) ----------
export const listCouponTemplates = (params: any) => apiGet<PageResult<any>>('/coupons/templates', params);
export const createCouponTemplate = (d: any) => apiPost<any>('/coupons/templates', d);
export const updateCouponTemplate = (id: number, d: any) => apiPut<any>(`/coupons/templates/${id}`, d);
export const deleteCouponTemplate = (id: number) => apiDelete(`/coupons/templates/${id}`);
export const grantCoupon = (d: any) => apiPost<any>('/coupons/grant', d);
export const listCoupons = (params: any) => apiGet<PageResult<any>>('/coupons', params);
export const previewCoupon = (d: any) => apiPost<any>('/coupons/preview', d);
export const redeemCoupon = (d: any) => apiPost<any>('/coupons/redeem', d);
export const calcPromotion = (d: any) => apiPost<any>('/coupons/calc', d);

// ---------- 合同电子签 (§4.23) ----------
export const listContractTemplates = (params: any) => apiGet<PageResult<any>>('/contracts/templates', params);
export const createContractTemplate = (d: any) => apiPost<any>('/contracts/templates', d);
export const updateContractTemplate = (id: number, d: any) => apiPut<any>(`/contracts/templates/${id}`, d);
export const deleteContractTemplate = (id: number) => apiDelete(`/contracts/templates/${id}`);
export const listContracts = (params: any) => apiGet<PageResult<any>>('/contracts', params);
export const createContract = (d: any) => apiPost<any>('/contracts', d);
export const signContract = (id: number, d: any) => apiPost<any>(`/contracts/${id}/sign`, d);
export const invalidateContract = (id: number, reason?: string) => apiPost(`/contracts/${id}/invalidate`, { reason });

// ---------- 积分会员 (§4.19) ----------
export const listMemberLevels = (params: any) => apiGet<any[]>('/membership/levels', params);
export const createMemberLevel = (d: any) => apiPost<any>('/membership/levels', d);
export const updateMemberLevel = (id: number, d: any) => apiPut<any>(`/membership/levels/${id}`, d);
export const deleteMemberLevel = (id: number) => apiDelete(`/membership/levels/${id}`);
export const listMembers = (params: any) => apiGet<PageResult<any>>('/membership/members', params);
export const adjustPoints = (studentId: number, d: any) => apiPost<any>(`/membership/members/${studentId}/points`, d);
export const listPointLedger = (studentId: number) => apiGet<any[]>(`/membership/members/${studentId}/ledger`);

// ---------- 问卷满意度 (§4.22) ----------
export const listSurveyTemplates = (params: any) => apiGet<PageResult<any>>('/surveys/templates', params);
export const createSurveyTemplate = (d: any) => apiPost<any>('/surveys/templates', d);
export const deleteSurveyTemplate = (id: number) => apiDelete(`/surveys/templates/${id}`);
export const submitSurvey = (d: any) => apiPost<any>('/surveys/submit', d);
export const listSurveyResponses = (params: any) => apiGet<PageResult<any>>('/surveys/responses', params);
export const surveyStats = (templateId: number) => apiGet<any>(`/surveys/stats/${templateId}`);

// ---------- 看板预警 (§4.10) ----------
export const listAlertRules = (params: any) => apiGet<PageResult<any>>('/alert-rules', params);
export const createAlertRule = (d: any) => apiPost<any>('/alert-rules', d);
export const updateAlertRule = (id: number, d: any) => apiPut<any>(`/alert-rules/${id}`, d);
export const deleteAlertRule = (id: number) => apiDelete(`/alert-rules/${id}`);
export const checkAlert = (metrics: any) => apiPost<any>('/alert-rules/check', { metrics });

// ---------- 多校区组织 (§4.11) ----------
export const listOrgs = (params: any) => apiGet<any[]>('/orgs', params);
export const orgTree = () => apiGet<any[]>('/orgs/tree');
export const createOrg = (d: any) => apiPost<any>('/orgs', d);
export const updateOrg = (id: number, d: any) => apiPut<any>(`/orgs/${id}`, d);
export const deleteOrg = (id: number) => apiDelete(`/orgs/${id}`);

// 平台级租户中心（仅平台管理员）
export const listTenants = (params: any) => apiGet<any[]>('/platform/tenants', params);
export const createTenant = (d: any) => apiPost<any>('/platform/tenants', d);
export const updateTenant = (id: number, d: any) => apiPut<any>(`/platform/tenants/${id}`, d);
export const deleteTenant = (id: number) => apiDelete(`/platform/tenants/${id}`);

// ---------- 教材库存 (§4.20) ----------
export const listMaterials = (params: any) => apiGet<PageResult<any>>('/materials', params);
export const createMaterial = (d: any) => apiPost<any>('/materials', d);
export const updateMaterial = (id: number, d: any) => apiPut<any>(`/materials/${id}`, d);
export const deleteMaterial = (id: number) => apiDelete(`/materials/${id}`);
export const adjustStock = (id: number, d: any) => apiPost<any>(`/materials/${id}/stock`, d);
export const listMovements = (id: number) => apiGet<any[]>(`/materials/${id}/movements`);

// ---------- 机构成本 (§4.21) ----------
export const listCosts = (params: any) => apiGet<PageResult<any>>('/costs', params);
export const createCost = (d: any) => apiPost<any>('/costs', d);
export const updateCost = (id: number, d: any) => apiPut<any>(`/costs/${id}`, d);
export const deleteCost = (id: number) => apiDelete(`/costs/${id}`);
export const costStats = (orgId?: number) => apiGet<any>('/costs/stats/by-category' + (orgId ? `?orgId=${orgId}` : ''));

// ---------- 团购拼团 (§4.24) ----------
export const listGroupBuyActivities = (params: any) => apiGet<PageResult<any>>('/group-buy/activities', params);
export const createGroupBuyActivity = (d: any) => apiPost<any>('/group-buy/activities', d);
export const updateGroupBuyActivity = (id: number, d: any) => apiPut<any>(`/group-buy/activities/${id}`, d);
export const deleteGroupBuyActivity = (id: number) => apiDelete(`/group-buy/activities/${id}`);
export const createTeam = (d: any) => apiPost<any>('/group-buy/teams', d);
export const joinTeam = (d: any) => apiPost<any>('/group-buy/teams/join', d);
export const listTeams = (activityId: number) => apiGet<any[]>('/group-buy/teams', { activityId });
export const redeemGroupBuy = (code: string) => apiPost<any>('/group-buy/redeem', { code });

// ---------- 分销裂变 (§4.28) ----------
export const listDistributors = (params: any) => apiGet<PageResult<any>>('/distribution/distributors', params);
export const createDistributor = (d: any) => apiPost<any>('/distribution/distributors', d);
export const updateDistributor = (id: number, d: any) => apiPut<any>(`/distribution/distributors/${id}`, d);
export const deleteDistributor = (id: number) => apiDelete(`/distribution/distributors/${id}`);
export const distributorTree = () => apiGet<any[]>('/distribution/distributors/tree');
export const recordCommission = (d: any) => apiPost<any>('/distribution/commissions', d);
export const listCommissions = (distributorId: number) => apiGet<any[]>('/distribution/commissions', { distributorId });
export const settleCommission = (id: number, status: string) => apiPut<any>(`/distribution/commissions/${id}/settle`, { status });
export const distributionStats = () => apiGet<any>('/distribution/stats');

// ---------- 在线课堂/督学 (§4.13) ----------
export const listClasses = (params: any) => apiGet<PageResult<any>>('/teaching/classes', params);
export const createClass = (d: any) => apiPost<any>('/teaching/classes', d);
export const updateClass = (id: number, d: any) => apiPut<any>(`/teaching/classes/${id}`, d);
export const deleteClass = (id: number) => apiDelete(`/teaching/classes/${id}`);
export const startClass = (id: number) => apiPost<any>(`/teaching/classes/${id}/start`);
export const endClass = (id: number) => apiPost<any>(`/teaching/classes/${id}/end`);
export const recordStudy = (d: any) => apiPost<any>('/teaching/study', d);
export const listStudy = (classId: number) => apiGet<any[]>('/teaching/study', { classId });
export const studyStats = (classId: number) => apiGet<any>(`/teaching/study/stats/${classId}`);

// ---------- 看板增强 (§4.10) ----------
export const listMetricDefs = (category?: string) =>
  apiGet<{ list: any[] }>('/dashboards/metrics' + (category ? `?category=${category}` : ''));
export const createMetricDef = (d: any) => apiPost<any>('/dashboards/metrics', d);
export const updateMetricDef = (id: number, d: any) => apiPut<any>(`/dashboards/metrics/${id}`, d);
export const removeMetricDef = (id: number) => apiDelete(`/dashboards/metrics/${id}`);
export const getBenchmark = () => apiGet<any>('/dashboards/benchmark');
export const customReport = (d: any) => apiPost<any>('/dashboards/report', d);
export const evaluateAlerts = () => apiPost<any>('/alert-rules/evaluate');

// 报表导出（后端生成文件流：Excel=CSV / PDF）
export const exportReportFile = (d: any) =>
  downloadFile('/dashboards/report/export', { method: 'POST', data: d, fallbackName: 'report.csv' });
export const exportBenchmarkFile = (format: string) =>
  downloadFile(`/dashboards/benchmark/export?format=${format}`, {
    method: 'GET',
    fallbackName: 'benchmark.csv',
  });

