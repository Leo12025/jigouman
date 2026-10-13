import { HttpException } from '@nestjs/common';
import { ResCode } from '../constants/response-code';

/**
 * 业务异常：直接抛出，由 AllExceptionsFilter 包装为统一响应。
 * throw new BusinessException(ResCode.CONFLICT, '课时不足');
 */
export class BusinessException extends HttpException {
  public readonly bizCode: number;
  /**
   * 附加业务数据：由 AllExceptionsFilter 写入响应体 data。
   * 典型用途：合规二次确认（{ needConfirm: true, violations: [...] }），
   * 前端据此弹窗提示"是否继续"，用户确认后携带 confirmCompliance=true 重新提交。
   */
  public readonly payload?: unknown;

  constructor(bizCode: ResCode, message?: string, payload?: unknown, cause?: unknown) {
    // 以业务码作为 HTTP 状态码（如 409 冲突 / 403 无权限），
    // 使网关与客户端可直接按状态码分流；body.code 同步携带业务码。
    super(
      { code: bizCode, message: message ?? '业务异常' },
      bizCode,
      { cause },
    );
    this.bizCode = bizCode;
    this.payload = payload;
  }
}
