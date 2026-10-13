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
  @ApiOperation({ summary: '储值充值(含预存赠送,如充5000送500)' })
  recharge(@TenantId() t: number, @Body() d: RechargeDto, @CurrentUser() u: AuthUser) {
    return this.svc.recharge(t, d, u.id);
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
  @ApiOperation({ summary: '退费退回储值(仅退本金,赠送不退)' })
  refund(@TenantId() t: number, @Body() d: RefundToStoredValueDto, @CurrentUser() u: AuthUser) {
    return this.svc.refundToStoredValue(t, d, u.id);
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
