import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Put,
  Delete,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId, CurrentUser, AuthUser } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';
import { CreateMetricDefDto, UpdateMetricDefDto } from './dto/metric-def.dto';
import { CustomReportDto } from './dto/report.dto';

/**
 * 数据看板（M6，文档 §4.10 / §6.7）。
 * 对齐：GET /api/v1/dashboards/{role}，role ∈ principal|admission|teaching。
 * §4.10 增强：动态指标定义 CRUD（POST/GET/PUT/DELETE /dashboards/metrics）。
 */
@ApiTags('数据看板 Dashboard')
@Controller('dashboards')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('benchmark')
  @RequirePermissions('dashboard:view')
  @ApiOperation({ summary: '连锁多校区汇总对标(成本/库存按校区聚合+对比)' })
  benchmark(@TenantId() t: number) {
    return this.svc.campusBenchmark(t);
  }

  @Get('metrics')
  @RequirePermissions('dashboard:view')
  @ApiOperation({ summary: '指标定义列表(可按 category 过滤)' })
  listMetrics(
    @TenantId() t: number,
    @Query('category') category?: string,
  ) {
    return this.svc.listMetricDefs(t, category);
  }

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

  @Post('metrics')
  @RequirePermissions('dashboard:create')
  @ApiOperation({ summary: '新增动态指标定义' })
  createMetric(
    @TenantId() t: number,
    @Body() d: CreateMetricDefDto,
    @CurrentUser() u: AuthUser,
  ) {
    void u;
    return this.svc.createMetricDef(t, d);
  }

  @Put('metrics/:id')
  @RequirePermissions('dashboard:update')
  @ApiOperation({ summary: '更新指标定义' })
  updateMetric(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: UpdateMetricDefDto,
  ) {
    return this.svc.updateMetricDef(t, id, d);
  }

  @Delete('metrics/:id')
  @RequirePermissions('dashboard:delete')
  @ApiOperation({ summary: '删除指标定义' })
  removeMetric(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeMetricDef(t, id);
  }

  @Post('report')
  @RequirePermissions('report:view')
  @ApiOperation({ summary: '自定义报表：按数据源/维度/指标聚合' })
  report(@TenantId() t: number, @Body() d: CustomReportDto) {
    return this.svc.customReport(t, d);
  }
}
