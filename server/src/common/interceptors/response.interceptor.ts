import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { ResCode } from '../constants/response-code';

/**
 * 统一成功响应包装：{ code:0, message, data, traceId }
 * 业务异常由 AllExceptionsFilter 统一处理。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const traceId = randomUUID();
    return next.handle().pipe(
      map((data) => ({
        code: ResCode.SUCCESS,
        message: 'success',
        data: data ?? null,
        traceId,
        timestamp: Date.now(),
      })),
    );
  }
}
