import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/decorators/auth.decorator';

/**
 * 多租户守卫（文档 §2.2 单库多租户 tenant_id 隔离 + §7 数据权限）。
 * 解析顺序：JWT 用户租户 > X-Tenant-Id 头 > 默认租户。
 * 将最终 tenantId 挂载到 req.tenantId，供 Service 层做数据隔离。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;
    const headerTenant = req.header('X-Tenant-Id');

    let tenantId: number;
    if (user?.tenantId) {
      tenantId = user.tenantId;
    } else if (headerTenant && !Number.isNaN(Number(headerTenant))) {
      tenantId = Number(headerTenant);
    } else {
      tenantId = Number(process.env.DEFAULT_TENANT_ID) || 0;
    }

    (req as any).tenantId = tenantId;
    return true;
  }
}
