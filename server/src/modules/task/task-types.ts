/**
 * 待办任务类型与阈值（文档 §4.26 待办中心）。
 * 任务来源为事件化生成：
 *  - 点名消课完成 → AFTER_CLASS_REVIEW（课后点评）
 *  - 学员提交作业 → HOMEWORK_REVIEW（作业批改）
 *  - 测评/课次结束 → SCORE_ENTRY（成绩录入）
 *  - 课次开始 → ATTENDANCE（点名消课）
 *  - 客诉分派 → COMPLAINT（客诉处理）
 *  - 审批发起 → APPROVAL（审批）
 */
export const TASK_TYPES = {
  AFTER_CLASS_REVIEW: 'AFTER_CLASS_REVIEW',
  HOMEWORK_REVIEW: 'HOMEWORK_REVIEW',
  SCORE_ENTRY: 'SCORE_ENTRY',
  ATTENDANCE: 'ATTENDANCE',
  COMPLAINT: 'COMPLAINT',
  APPROVAL: 'APPROVAL',
} as const;

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

export const TASK_TYPE_LABELS: Record<string, string> = {
  AFTER_CLASS_REVIEW: '课后点评',
  HOMEWORK_REVIEW: '作业批改',
  SCORE_ENTRY: '成绩录入',
  ATTENDANCE: '点名消课',
  COMPLAINT: '客诉处理',
  APPROVAL: '审批',
};

/**
 * 严重逾期阈值（小时）：超过则标记严重逾期，需升级主管（§4.26 升级规则）。
 * 普通逾期仅标红提醒，严重逾期进入升级名单。
 */
export const TASK_SEVERE_OVERDUE_HOURS = 72;
