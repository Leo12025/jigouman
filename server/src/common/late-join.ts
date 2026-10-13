/**
 * 插班折减计算（文档 §2.3 #12）：期课统一开班结班，中途报名只能插班，
 * **插班生按剩余课次折减学费**。
 *
 * 口径（与示范合同"按课时收费"口径一致，取课次类比课时）：
 *   折减金额 = 学费 × (已过课次 ÷ 总课次)
 *   实付金额 = 学费 − 折减金额
 *   该生可上课次 = 总课次 − 已过课次
 */
export interface LateJoinInput {
  /** 班期总课次 */
  totalLessons: number;
  /** 报名时已上过的课次（插班时 >0） */
  finishedLessons: number;
  /** 全程学费 */
  tuition: number;
}

export interface LateJoinResult {
  totalLessons: number;
  finishedLessons: number;
  /** 该生实际可上课次 */
  remainLessons: number;
  /** 折减课次 */
  discountHours: number;
  /** 折减金额 */
  discountAmount: number;
  /** 实付金额 */
  payableAmount: number;
}

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

export function calcLateJoin(p: LateJoinInput): LateJoinResult {
  const total = Math.max(0, Math.floor(Number(p.totalLessons) || 0));
  const finished = Math.min(total, Math.max(0, Math.floor(Number(p.finishedLessons) || 0)));
  const remain = total - finished;
  const tuition = Math.max(0, Number(p.tuition) || 0);
  const discountAmount = total > 0 ? r2((tuition * finished) / total) : 0;
  return {
    totalLessons: total,
    finishedLessons: finished,
    remainLessons: remain,
    discountHours: finished,
    discountAmount,
    payableAmount: Math.max(0, r2(tuition - discountAmount)),
  };
}
