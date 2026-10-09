import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';

/**
 * 数据看板（M6，文档 §4.10 / §6.7）。
 * 对齐：GET /api/v1/dashboards/{role}，role ∈ principal|admission|teaching。
 */
@ApiTags('数据看板 Dashboard')
@Controller('dashboards')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get(':role')
  @RequirePermissions('dashboard:view')
  @ApiOperation({ summary: '经营/招生/教学看板(role=principal|admission|teaching)' })
  get(
    @TenantId() t: number,
    @Param('role') role: string,
    @Query() q: DashboardQueryDto,
  ) {
    return this.svc.byRole(t, role, q);
  }
}
