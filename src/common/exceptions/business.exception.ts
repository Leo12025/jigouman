import { HttpException } from '@nestjs/common';
import { ResCode } from '../constants/response-code';

/**
 * 业务异常：直接抛出，由 AllExceptionsFilter 包装为统一响应。
 * throw new BusinessException(ResCode.CONFLICT, '课时不足');
 */
export class BusinessException extends HttpException {
  public readonly bizCode: number;

  constructor(bizCode: ResCode, message?: string, cause?: unknown) {
    // 以业务码作为 HTTP 状态码（如 409 冲突 / 403 无权限），
    // 使网关与客户端可直接按状态码分流；body.code 同步携带业务码。
    super(
      { code: bizCode, message: message ?? '业务异常' },
      bizCode,
      { cause },
    );
    this.bizCode = bizCode;
  }
}
