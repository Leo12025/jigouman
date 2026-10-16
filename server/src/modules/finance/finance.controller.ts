import {
  Controller, Post, Get, Put, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  SplitPageQueryDto, SettleSplitDto, GenerateSalaryDto, SalaryPageQueryDto,
  ApplyInvoiceDto, InvoicePageQueryDto, FinanceSummaryQueryDto, UpsertSplitConfigDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('财务 Finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @Get('split-config')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '分账配置' })
  config(@TenantId() t: number) {
    return this.svc.getConfig(t);
  }

  @Put('split-config')
  @RequirePermissions('finance:update')
  @OperationLog({ action: 'finance:update', target: 'split_config' })
  @ApiOperation({ summary: '更新分账配置(提成/分成率)' })
  upsertConfig(@TenantId() t: number, @Body() d: UpsertSplitConfigDto) {
    return this.svc.upsertConfig(t, d);
  }

  @Get('splits')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '分账记录(教师提成/渠道分成)' })
  splits(@TenantId() t: number, @Query() q: SplitPageQueryDto) {
    return this.svc.listSplits(t, q);
  }

  @Post('splits/settle')
  @RequirePermissions('finance:update')
  @OperationLog({ action: 'finance:settle', target: 'split_record' })
  @ApiOperation({ summary: '结算分账(按周期/老师/指定记录)' })
  settle(@TenantId() t: number, @Body() d: SettleSplitDto) {
    return this.svc.settleSplits(t, d);
  }

  @Post('salary/generate')
  @RequirePermissions('finance:update')
  @OperationLog({ action: 'finance:generate', target: 'salary' })
  @ApiOperation({ summary: '生成教师工资单(按周期聚合分账)' })
  genSalary(@TenantId() t: number, @Body() d: GenerateSalaryDto) {
    return this.svc.generateSalary(t, d);
  }

  @Get('salary')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '教师工资单列表' })
  salary(@TenantId() t: number, @Query() q: SalaryPageQueryDto) {
    return this.svc.listSalary(t, q);
  }

  @Put('salary/:id/confirm')
  @RequirePermissions('finance:update')
  @ApiOperation({ summary: '确认工资单' })
  confirmSalary(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.confirmSalary(t, Number(id));
  }

  @Put('salary/:id/pay')
  @RequirePermissions('finance:update')
  @OperationLog({ action: 'finance:pay', target: 'salary' })
  @ApiOperation({ summary: '发放工资' })
  paySalary(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.paySalary(t, Number(id));
  }

  @Post('invoices')
  @RequirePermissions('finance:create')
  @OperationLog({ action: 'finance:invoice', target: 'invoice' })
  @ApiOperation({ summary: '申请电子发票' })
  applyInvoice(@TenantId() t: number, @Body() d: ApplyInvoiceDto) {
    return this.svc.applyInvoice(t, d);
  }

  @Put('invoices/:id/issue')
  @RequirePermissions('finance:update')
  @OperationLog({ action: 'finance:issue', target: 'invoice' })
  @ApiOperation({ summary: '开具发票' })
  issueInvoice(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.issueInvoice(t, Number(id));
  }

  @Get('invoices')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '发票列表' })
  invoices(@TenantId() t: number, @Query() q: InvoicePageQueryDto) {
    return this.svc.listInvoices(t, q);
  }

  @Get('invoices/:id')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '发票详情' })
  invoice(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getInvoice(t, Number(id));
  }

  @Get('summary')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: '财务报表汇总(收支/利润/现金流)' })
  summary(@TenantId() t: number, @Query() q: FinanceSummaryQueryDto) {
    return this.svc.summary(t, q);
  }

  @Get('reconcile')
  @RequirePermissions('finance:view')
  @ApiOperation({ summary: 'AI 智能对账(订单vs收款vs退款, 差异需人工复核)' })
  reconcile(@TenantId() t: number) {
    return this.svc.reconcile(t);
  }
}
