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
      map((data) => {
        // 控制器已通过 @Res() 直接发送响应（如文件下载），避免二次包装导致报错
        const res = context.switchToHttp().getResponse();
        if (res && res.headersSent) return data;
        return {
          code: ResCode.SUCCESS,
          message: 'success',
          data: data ?? null,
          traceId,
          timestamp: Date.now(),
        };
      }),
    );
  }
}
