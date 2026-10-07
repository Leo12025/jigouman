import {
  Controller,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { RbacService } from './rbac.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/rbac.dto';

@ApiTags('系统-用户 User')
@Controller('users')
export class UserController {
  constructor(private readonly svc: RbacService) {}

  @Get()
  @RequirePermissions('user:view')
  @ApiOperation({ summary: '用户列表(分页)' })
  list(@TenantId() t: number, @Query() q: PageQueryDto, @Query('keyword') keyword?: string) {
    return this.svc.listUsers(t, q, keyword);
  }

  @Post()
  @RequirePermissions('user:create')
  @OperationLog({ action: 'user:create', target: 'sys_user' })
  @ApiOperation({ summary: '新建用户' })
  create(@TenantId() t: number, @Body() d: CreateUserDto) {
    return this.svc.createUser(t, d);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  @OperationLog({ action: 'user:update', target: 'sys_user' })
  @ApiOperation({ summary: '编辑用户/分配角色' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateUserDto) {
    return this.svc.updateUser(t, id, d);
  }

  @Post(':id/reset-password')
  @RequirePermissions('user:update')
  @OperationLog({ action: 'user:reset-password', target: 'sys_user' })
  @ApiOperation({ summary: '重置密码' })
  resetPassword(@TenantId() t: number, @Param('id') id: number, @Body() d: ResetPasswordDto) {
    return this.svc.resetPassword(t, id, d.password);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @OperationLog({ action: 'user:delete', target: 'sys_user' })
  @ApiOperation({ summary: '删除用户' })
  remove(@TenantId() t: number, @Param('id') id: number, @CurrentUser() u: AuthUser) {
    return this.svc.removeUser(t, id, u.id);
  }
}

@ApiTags('系统-角色 Role')
@Controller('roles')
export class RoleController {
  constructor(private readonly svc: RbacService) {}

  @Get()
  @RequirePermissions('role:view')
  @ApiOperation({ summary: '角色列表' })
  list(@TenantId() t: number) {
    return this.svc.listRoles(t);
  }

  @Post()
  @RequirePermissions('role:create')
  @OperationLog({ action: 'role:create', target: 'role' })
  @ApiOperation({ summary: '新建角色' })
  create(@TenantId() t: number, @Body() d: CreateRoleDto) {
    return this.svc.createRole(t, d);
  }

  @Put(':id')
  @RequirePermissions('role:update')
  @OperationLog({ action: 'role:update', target: 'role' })
  @ApiOperation({ summary: '编辑角色/分配权限' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateRoleDto) {
    return this.svc.updateRole(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @OperationLog({ action: 'role:delete', target: 'role' })
  @ApiOperation({ summary: '删除角色' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeRole(t, id);
  }
}

@ApiTags('系统-权限 Permission')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly svc: RbacService) {}

  @Get()
  @RequirePermissions('permission:view')
  @ApiOperation({ summary: '权限点列表' })
  list(@TenantId() t: number) {
    return this.svc.listPermissions(t);
  }
}
