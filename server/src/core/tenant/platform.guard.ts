import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/decorators/auth.decorator';

/**
 * 平台守卫：仅「默认租户(平台)」的登录账号可访问租户中心等平台级接口。
 * 默认租户由 DEFAULT_TENANT_ID 指定（即原默认机构，既是业务租户也是平台租户）。
 */
@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;
    const platformTenant = Number(process.env.DEFAULT_TENANT_ID) || 0;
    if (!user || user.tenantId !== platformTenant) {
      throw new ForbiddenException('仅平台管理员可访问租户中心');
    }
    return true;
  }
}
