import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { CreateOrgDto, UpdateOrgDto } from './dto/org.dto';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PlatformGuard } from '../../core/tenant/platform.guard';

/**
 * 平台钻取：平台管理员可代管某个租户（机构/总校区）的校区组织树。
 * 路由携带 :tenantId，直接走 OrgService 并显式传目标租户，与登录用户的租户无关。
 * 权限：平台守卫 + tenant:manage（平台管理员）。
 */
@ApiTags('平台-租户校区 Org')
@Controller('platform/tenants/:tenantId/orgs')
@UseGuards(PlatformGuard)
export class PlatformOrgController {
  constructor(private readonly orgSvc: OrgService) {}

  @Get('tree')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '某租户的校区组织树（平台钻取）' })
  tree(@Param('tenantId') tenantId: string) {
    return this.orgSvc.tree(Number(tenantId));
  }

  @Get(':id')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '某租户下组织详情' })
  get(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.orgSvc.get(Number(tenantId), Number(id));
  }

  @Post()
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '新建校区/分校/总校区（平台代租户）' })
  create(@Param('tenantId') tenantId: string, @Body() d: CreateOrgDto) {
    return this.orgSvc.create(Number(tenantId), d);
  }

  @Put(':id')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '更新组织' })
  update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() d: UpdateOrgDto) {
    return this.orgSvc.update(Number(tenantId), Number(id), d);
  }

  @Delete(':id')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '删除组织(需无下级)' })
  remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.orgSvc.remove(Number(tenantId), Number(id));
  }
}
