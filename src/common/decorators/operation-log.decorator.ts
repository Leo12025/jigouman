import { SetMetadata } from '@nestjs/common';

/**
 * 操作日志注解：标记需要落审计日志的写操作（文档 §7 审计要求 who/when/what/before/after）。
 * @OperationLog({ action: 'course:create', target: 'course' })
 */
export const OPERATION_LOG_KEY = 'operationLog';

export interface OperationLogMeta {
  action: string;
  target: string;
  /** 是否记录 before/after 快照 */
  snapshot?: boolean;
}

export const OperationLog = (meta: OperationLogMeta) =>
  SetMetadata(OPERATION_LOG_KEY, meta);
