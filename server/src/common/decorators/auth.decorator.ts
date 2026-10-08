import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';

/** 当前登录用户（JWT 解析后挂载到 req.user） */
export interface AuthUser {
  id: number;
  tenantId: number;
  username: string;
  roleIds: number[];
  permissions: string[];
  /** 身份类型：staff 员工/管理员（PC 端）；parent 家长（移动端 H5，§6.23） */
  kind?: 'staff' | 'parent';
  /** 家长手机号（kind=parent 时有值） */
  phone?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser;
    return data ? user?.[data] : user;
  },
);

/** 当前租户 ID（由 TenantGuard 注入 req.tenantId） */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as any).tenantId as number;
  },
);

/** 标记接口为公开（跳过 JWT 校验），如登录、OTP */
export const Public = () => SetMetadata('isPublic', true);
