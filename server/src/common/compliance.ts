import { BusinessException } from './exceptions/business.exception';
import { ResCode } from './constants/response-code';

/**
 * 预收费合规阈值（文档 §0 / §4.4）。
 * 红线：不得一次性收取（含充值、次卡等变相形式）时间跨度超过 3 个月或 60 课时的费用，
 * 且一次性收取不得超过 5000 元。各地口径存在差异（如武汉 2020 版对非中小学生机构为 6 个月或 80 学时），
 * 因此阈值做成**租户级可配置**，默认值取最严口径。
 */
export interface ComplianceLimits {
  /** 单次收取课时上限 */
  maxHours: number;
  /** 单次收取金额上限(元) */
  maxAmount: number;
  /** 时长跨度上限(天) */
  maxValidDays: number;
  /** 学员维度累计未消课时上限（反"拆单绕过"） */
  cumulativeHours: number;
}

export const DEFAULT_LIMITS: ComplianceLimits = {
  maxHours: 60,
  maxAmount: 5000,
  maxValidDays: 90,
  cumulativeHours: 60,
};

function toNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 解析租户配置 JSON（tenants.config） */
export function parseTenantConfig(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** 解析生效阈值：租户配置 > 环境变量 > 内置默认（最严） */
export function resolveLimits(tenantConfigRaw?: string | null): ComplianceLimits {
  const cfg = parseTenantConfig(tenantConfigRaw);
  const c = (cfg.compliance || {}) as Partial<ComplianceLimits>;
  return {
    maxHours: toNum(c.maxHours ?? process.env.MAX_PACKAGE_HOURS, DEFAULT_LIMITS.maxHours),
    maxAmount: toNum(c.maxAmount ?? process.env.MAX_PACKAGE_AMOUNT, DEFAULT_LIMITS.maxAmount),
    maxValidDays: toNum(c.maxValidDays ?? process.env.MAX_PACKAGE_DAYS, DEFAULT_LIMITS.maxValidDays),
    cumulativeHours: toNum(
      c.cumulativeHours ?? process.env.MAX_STUDENT_PENDING_HOURS,
      DEFAULT_LIMITS.cumulativeHours,
    ),
  };
}

export interface ComplianceSubject {
  hours?: number;
  amount?: number;
  validDays?: number;
}

/** 返回违规项描述（空数组=合规） */
export function checkCompliance(limits: ComplianceLimits, s: ComplianceSubject): string[] {
  return [...checkHoursAmount(limits, s), ...checkValidDays(limits, s)];
}

/**
 * 课时 / 金额违规（**可二次确认后继续**）。
 * 业务上允许机构在知情前提下超配（如属地口径更宽松、或大额定制单），
 * 因此这类校验返回违规项由调用方决定是否要求"点击继续"。
 */
export function checkHoursAmount(limits: ComplianceLimits, s: ComplianceSubject): string[] {
  const errs: string[] = [];
  if (s.hours != null && s.hours > limits.maxHours) {
    errs.push(`课时数 ${s.hours} 超出预收费监管上限 ${limits.maxHours} 课时`);
  }
  if (s.amount != null && s.amount > limits.maxAmount) {
    errs.push(`金额 ${s.amount} 元超出预收费监管上限 ${limits.maxAmount} 元`);
  }
  return errs;
}

/** 时长跨度(3个月)违规（同属可二次确认项） */
export function checkValidDays(limits: ComplianceLimits, s: ComplianceSubject): string[] {
  const errs: string[] = [];
  if (s.validDays != null && s.validDays > limits.maxValidDays) {
    errs.push(`有效期 ${s.validDays} 天超出预收费监管上限 ${limits.maxValidDays} 天(3个月)`);
  }
  return errs;
}

export const COMPLIANCE_CONFIRM_HINT =
  '超出预收费监管上限，如确认继续请携带 confirmCompliance=true 重新提交';

/**
 * 可二次确认的合规校验：
 * - 无违规 → 直接通过
 * - confirm=true → 放行（视为机构已知情确认）
 * - 否则 → 抛 400，payload 带 needConfirm/violations，前端弹窗提示后重新提交
 */
export function assertComplianceConfirmable(
  errs: string[],
  confirm?: boolean,
  prefix?: string,
): void {
  if (!errs.length) return;
  if (confirm === true) return;
  const message = prefix ? `${prefix}：${errs.join('；')}` : errs.join('；');
  throw new BusinessException(ResCode.BAD_REQUEST, message, {
    needConfirm: true,
    violations: errs,
    hint: COMPLIANCE_CONFIRM_HINT,
  });
}

/** 硬阻断校验（无"继续"入口） */
export function assertComplianceHard(errs: string[], prefix?: string): void {
  if (!errs.length) return;
  const message = prefix ? `${prefix}：${errs.join('；')}` : errs.join('；');
  throw new BusinessException(ResCode.BAD_REQUEST, message);
}
