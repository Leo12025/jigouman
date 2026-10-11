import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { TenantService } from '../../modules/tenant/tenant.service';

/**
 * 多租户守卫（文档 §2.2 单库多租户 tenant_id 隔离 + §7 数据权限 + 域名路由）。
 * 解析顺序：
 *   1. 已登录 -> 信任 JWT 中的 tenantId（防止通过 Host 伪造跨租户访问）
 *   2. 未登录（登录/公开接口）-> 按 Host 域名解析租户（多租户网关核心）
 *   3. X-Tenant-Id 头（服务端/内部调用）
 *   4. 默认租户
 * 最终 tenantId 挂载到 req.tenantId，供 Service 层做数据隔离。
 * 校区上下文(orgId)由 OrgContextMiddleware 经 AsyncLocalStorage.run 注入。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;

    // 1) 解析租户：已登录信任 JWT；未登录按 Host 域名；再回退 X-Tenant-Id / 默认
    if (user?.tenantId) {
      (req as any).tenantId = user.tenantId;
    } else {
      const host = req.header('host');
      const tenant = await this.tenantService.findByHost(host);
      if (tenant) {
        (req as any).tenantId = tenant.id;
      } else {
        const headerTenant = req.header('X-Tenant-Id');
        (req as any).tenantId =
          headerTenant && !Number.isNaN(Number(headerTenant))
            ? Number(headerTenant)
            : Number(process.env.DEFAULT_TENANT_ID) || 0;
      }
    }

    return true;
  }
}
