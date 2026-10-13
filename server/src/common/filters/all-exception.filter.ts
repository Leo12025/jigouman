import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { ResCode, ResMessage } from '../constants/response-code';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 兜底异常过滤器：所有未显式处理的异常均收敛为统一结构。
 * 业务异常(BusinessException)也走此过滤器（其 http 状态为 200，但 code 取 bizCode）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const traceId = randomUUID();

    let code = ResCode.INTERNAL_ERROR;
    let message = ResMessage[ResCode.INTERNAL_ERROR];
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    // 业务异常可携带附加数据（如合规二次确认的违规项），回写给前端用于弹窗提示
    let data: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      if (res && typeof res === 'object' && 'code' in res) {
        // BusinessException 形态
        code = res.code;
        message = res.message || ResMessage[code] || 'error';
      } else {
        code = status as unknown as ResCode;
        message =
          (typeof res === 'string' ? res : res?.message) ||
          ResMessage[status] ||
          'error';
      }
      if (exception instanceof BusinessException && exception.payload !== undefined) {
        data = exception.payload;
      }
    }

    // 返回真实 HTTP 状态（401/403/409/500…），业务码同时写入 body.code，
    // 既符合 REST 语义，也便于网关/客户端按状态码分流。
    response.status(status).json({
      code,
      message,
      data,
      traceId,
      timestamp: Date.now(),
    });
  }
}
