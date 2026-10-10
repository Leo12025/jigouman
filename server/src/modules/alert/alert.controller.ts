import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { AlertService } from './alert.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto, CheckAlertDto, AlertPageQueryDto } from './dto/alert.dto';

@ApiTags('看板预警 Alert')
@Controller('alert-rules')
export class AlertController {
  constructor(private readonly svc: AlertService) {}

  @Post()
  @RequirePermissions('alert:create')
  @ApiOperation({ summary: '新建预警规则' })
  create(@TenantId() t: number, @Body() d: CreateAlertRuleDto) { return this.svc.createRule(t, d); }
  @Get()
  @RequirePermissions('alert:view')
  @ApiOperation({ summary: '预警规则列表' })
  list(@TenantId() t: number, @Query() q: AlertPageQueryDto) { return this.svc.listRules(t, q); }
  @Get(':id')
  @RequirePermissions('alert:view')
  @ApiOperation({ summary: '规则详情' })
  get(@TenantId() t: number, @Param('id') id: string) { return this.svc.getRule(t, Number(id)); }
  @Put(':id')
  @RequirePermissions('alert:update')
  @ApiOperation({ summary: '更新规则' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateAlertRuleDto) { return this.svc.updateRule(t, Number(id), d); }
  @Delete(':id')
  @RequirePermissions('alert:delete')
  @ApiOperation({ summary: '删除规则(软删)' })
  remove(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeRule(t, Number(id)); }

  @Post('check')
  @RequirePermissions('alert:view')
  @ApiOperation({ summary: '传入指标值，返回触发的规则' })
  check(@TenantId() t: number, @Body() d: CheckAlertDto) { return this.svc.check(t, d.metrics); }

  @Post('evaluate')
  @RequirePermissions('alert:update')
  @ApiOperation({ summary: '取看板当前指标快照评估全部规则，命中即推送通知给接收人' })
  evaluate(@TenantId() t: number) { return this.svc.evaluate(t); }
}
