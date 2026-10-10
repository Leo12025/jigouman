import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { DistributionService } from './distribution.service';
import { CreateDistributorDto, UpdateDistributorDto, RecordCommissionDto, SettleCommissionDto, DistributorPageQueryDto } from './dto/distribution.dto';

@ApiTags('分销裂变 Distribution')
@Controller('distribution')
export class DistributionController {
  constructor(private readonly svc: DistributionService) {}

  @Post('distributors')
  @RequirePermissions('distribution:create')
  @ApiOperation({ summary: '新增分销员' })
  createDist(@TenantId() t: number, @Body() d: CreateDistributorDto) { return this.svc.createDistributor(t, d); }

  @Get('distributors')
  @RequirePermissions('distribution:view')
  @ApiOperation({ summary: '分销员列表' })
  listDist(@TenantId() t: number, @Query() q: DistributorPageQueryDto) { return this.svc.listDistributors(t, q); }

  @Get('distributors/tree')
  @RequirePermissions('distribution:view')
  @ApiOperation({ summary: '分销层级树' })
  tree(@TenantId() t: number) { return this.svc.tree(t); }

  @Get('distributors/:id')
  @RequirePermissions('distribution:view')
  @ApiOperation({ summary: '分销员详情' })
  getDist(@TenantId() t: number, @Param('id') id: string) { return this.svc.getDistributor(t, Number(id)); }

  @Put('distributors/:id')
  @RequirePermissions('distribution:update')
  @ApiOperation({ summary: '更新分销员' })
  updateDist(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateDistributorDto) { return this.svc.updateDistributor(t, Number(id), d); }

  @Delete('distributors/:id')
  @RequirePermissions('distribution:delete')
  @ApiOperation({ summary: '删除分销员(软删)' })
  removeDist(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeDistributor(t, Number(id)); }

  @Post('commissions')
  @RequirePermissions('distribution:create')
  @ApiOperation({ summary: '登记佣金' })
  recordComm(@TenantId() t: number, @Body() d: RecordCommissionDto) { return this.svc.recordCommission(t, d); }

  @Get('commissions')
  @RequirePermissions('distribution:view')
  @ApiOperation({ summary: '佣金列表(按分销员)' })
  listComm(@TenantId() t: number, @Query('distributorId') distributorId: string) { return this.svc.listCommissions(t, Number(distributorId)); }

  @Put('commissions/:id/settle')
  @RequirePermissions('distribution:update')
  @ApiOperation({ summary: '结算/作废佣金' })
  settle(@TenantId() t: number, @Param('id') id: string, @Body() d: SettleCommissionDto) { return this.svc.settleCommission(t, Number(id), d.status); }

  @Get('stats')
  @RequirePermissions('distribution:view')
  @ApiOperation({ summary: '佣金汇总' })
  stats(@TenantId() t: number) { return this.svc.stats(t); }
}
