import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { CostService } from './cost.service';
import { CreateCostDto, UpdateCostDto, CostPageQueryDto } from './dto/cost.dto';

@ApiTags('机构成本 Cost')
@Controller('costs')
export class CostController {
  constructor(private readonly svc: CostService) {}

  @Post()
  @RequirePermissions('cost:create')
  @ApiOperation({ summary: '登记成本' })
  create(@TenantId() t: number, @Body() d: CreateCostDto) { return this.svc.create(t, d); }
  @Get()
  @RequirePermissions('cost:view')
  @ApiOperation({ summary: '成本列表' })
  list(@TenantId() t: number, @Query() q: CostPageQueryDto) { return this.svc.list(t, q); }
  @Get(':id')
  @RequirePermissions('cost:view')
  @ApiOperation({ summary: '成本详情' })
  get(@TenantId() t: number, @Param('id') id: string) { return this.svc.get(t, Number(id)); }
  @Put(':id')
  @RequirePermissions('cost:update')
  @ApiOperation({ summary: '更新成本' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateCostDto) { return this.svc.update(t, Number(id), d); }
  @Delete(':id')
  @RequirePermissions('cost:delete')
  @ApiOperation({ summary: '删除成本(软删)' })
  remove(@TenantId() t: number, @Param('id') id: string) { return this.svc.remove(t, Number(id)); }

  @Get('stats/by-category')
  @RequirePermissions('cost:view')
  @ApiOperation({ summary: '成本按类别汇总' })
  stats(@TenantId() t: number, @Query('orgId') orgId?: string) { return this.svc.stats(t, orgId ? Number(orgId) : undefined); }
}
