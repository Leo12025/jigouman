import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { AuthUser } from '../../common/decorators/auth.decorator';
import {
  OPERATION_LOG_KEY,
  OperationLogMeta,
} from '../../common/decorators/operation-log.decorator';

/**
 * 审计拦截器：扫描 @OperationLog 注解，在写操作成功后落审计日志。
 * 仅记录命中的 POST/PUT/DELETE/PATCH。
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<OperationLogMeta>(
      OPERATION_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;
    const method = req.method.toUpperCase();
    if (!user || !['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.auditService.record({
          user,
          action: meta.action,
          target: meta.target,
          method,
          path: req.originalUrl,
          ip: req.ip,
        });
      }),
    );
  }
}
