import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './dto/tenant.dto';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PlatformGuard } from '../../core/tenant/platform.guard';
import { RbacService } from '../../core/rbac/rbac.service';
import { OrgService } from '../org/org.service';

/** 平台级租户中心：仅默认租户(平台)的管理员可访问（PlatformGuard 把关） */
@ApiTags('平台-租户中心 Tenant')
@Controller('platform/tenants')
@UseGuards(PlatformGuard)
export class TenantController {
  constructor(
    private readonly svc: TenantService,
    private readonly rbac: RbacService,
    @Inject(forwardRef(() => OrgService)) private readonly orgSvc: OrgService,
  ) {}

  @Get()
  @RequirePermissions('tenant:view')
  @ApiOperation({ summary: '租户列表' })
  list(@Query() q: TenantQueryDto) {
    return this.svc.list(q);
  }

  @Get(':id')
  @RequirePermissions('tenant:view')
  @ApiOperation({ summary: '租户详情' })
  get(@Param('id') id: string) {
    return this.svc.get(Number(id));
  }

  @Post()
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '新建租户(同时初始化品牌域 RBAC、超级管理员与总校区)' })
  async create(@Body() d: CreateTenantDto) {
    const t = await this.svc.create(d);
    // 总域为品牌域创建对应管理员：初始化角色/权限 + 超级管理员(admin/admin123456)
    await this.rbac.seedTenant(t.id);
    // 租户即总校区：自动建根 HQ 节点，供校区管理/钻取
    await this.orgSvc.ensureHq(t.id, t.name);
    return t;
  }

  @Put(':id')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '更新租户(名称/域名/状态/配置)' })
  update(@Param('id') id: string, @Body() d: UpdateTenantDto) {
    return this.svc.update(Number(id), d);
  }

  @Delete(':id')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '删除租户(软删)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(Number(id));
  }
}
