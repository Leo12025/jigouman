import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { UpdateTenantSelfDto } from './dto/tenant.dto';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/auth.decorator';

/**
 * 租户自助中心：租户（由总校区/管理员代持）查看并维护自己的机构设置。
 * 与平台级「租户中心」(platform/tenants, PlatformGuard) 解耦——此处按 JWT 的 tenantId 限定本租户，
 * 且 GET 对所有租户内登录用户开放（主题/品牌/功能开关需对全员生效），仅 PUT 需 tenant:manage。
 */
@ApiTags('租户自助 Tenant-Self')
@Controller('tenant')
export class TenantSelfController {
  constructor(private readonly svc: TenantService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前租户(自助)：只读元数据 + 结构化 config' })
  me(@TenantId() tenantId: number) {
    return this.svc.getSelf(tenantId);
  }

  @Put('me')
  @RequirePermissions('tenant:manage')
  @ApiOperation({ summary: '更新当前租户(仅 name 与结构化 config; slug/域名/配额/有效期由平台管)' })
  update(@TenantId() tenantId: number, @Body() d: UpdateTenantSelfDto) {
    return this.svc.updateSelf(tenantId, d);
  }
}
