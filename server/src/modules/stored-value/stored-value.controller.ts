import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  RechargeDto, ConsumeDto, RefundToStoredValueDto,
  StoredValueAccountPageQueryDto, StoredValueLedgerPageQueryDto,
} from './dto/stored-value.dto';
import { StoredValueService } from './stored-value.service';

@ApiTags('储值卡 StoredValue')
@Controller('stored-value')
export class StoredValueController {
  constructor(private readonly svc: StoredValueService) {}

  @Post('recharge')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'stored-value:recharge', target: 'stored_value_account' })
  @ApiOperation({ summary: '发起储值充值申请(进入审批中心,含预存赠送)' })
  recharge(@TenantId() t: number, @Body() d: RechargeDto, @CurrentUser() u: AuthUser) {
    return this.svc.requestRecharge(t, d, u);
  }

  @Post('consume')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'stored-value:consume', target: 'stored_value_account' })
  @ApiOperation({ summary: '储值消费(优先扣赠送部分)' })
  consume(@TenantId() t: number, @Body() d: ConsumeDto, @CurrentUser() u: AuthUser) {
    return this.svc.consume(t, d, u.id);
  }

  @Post('refund')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'stored-value:refund', target: 'stored_value_account' })
  @ApiOperation({ summary: '发起退费退回储值申请(进入审批中心,仅退本金)' })
  refund(@TenantId() t: number, @Body() d: RefundToStoredValueDto, @CurrentUser() u: AuthUser) {
    return this.svc.requestRefund(t, d, u);
  }

  @Get('requests')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '储值资金操作审批请求列表' })
  requests(@TenantId() t: number, @Query() q: any) {
    return this.svc.listRequests(t, q);
  }

  @Get('accounts')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '储值账户列表' })
  accounts(@TenantId() t: number, @Query() q: StoredValueAccountPageQueryDto) {
    return this.svc.listAccounts(t, q);
  }

  @Get('ledgers')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '储值流水(充值/赠送/消费/退回)' })
  ledgers(@TenantId() t: number, @Query() q: StoredValueLedgerPageQueryDto) {
    return this.svc.listLedgers(t, q);
  }

  @Get('balance/:studentId')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '学员储值余额' })
  balance(@TenantId() t: number, @Param('studentId') studentId: number) {
    return this.svc.balance(t, Number(studentId));
  }
}
