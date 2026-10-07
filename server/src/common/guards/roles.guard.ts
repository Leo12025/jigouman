import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/auth.decorator';

/**
 * 权限守卫：校验当前用户是否持有接口所需权限点（RBAC，文档 §7）。
 * 无所需权限点时抛出 403。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!user) throw new ForbiddenException('无权限访问');

    const owned = new Set(user.permissions || []);
    const ok = required.some((p) => owned.has(p));
    if (!ok) throw new ForbiddenException('无权限访问');
    return true;
  }
}
