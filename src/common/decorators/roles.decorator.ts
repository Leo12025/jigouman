import { SetMetadata } from '@nestjs/common';

/**
 * 角色/权限守卫元数据。
 * @Roles('course:create', 'course:update')  —— 仅需命中任一权限
 * 或 @RequirePermissions(...) 语义一致。
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** 权限点（与 Roles 等价，语义更清晰） */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(ROLES_KEY, permissions);
