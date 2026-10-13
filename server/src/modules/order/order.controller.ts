import {
  Controller, Post, Get, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  OrderPageQueryDto, CreateOrderDto, PayOrderDto, RefundDto,
  CreateDepositOrderDto, ConvertDepositDto,
} from './dto/order.dto';
import { OrderService } from './order.service';

@ApiTags('订单与财务 Order')
@Controller('orders')
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  @Post()
  @RequirePermissions('order:create')
  @OperationLog({ action: 'order:create', target: 'orders' })
  @ApiOperation({ summary: '下单(选课程/课时包→算价→生成订单)' })
  create(@TenantId() t: number, @Body() d: CreateOrderDto) {
    return this.svc.createOrder(t, d);
  }

  @Get()
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '订单列表(分页)' })
  list(@TenantId() t: number, @Query() q: OrderPageQueryDto) {
    return this.svc.listOrders(t, q);
  }

  @Post('deposit')
  @RequirePermissions('order:create')
  @OperationLog({ action: 'order:create-deposit', target: 'orders' })
  @ApiOperation({ summary: '创建定金单(如集训营预约定金200抵800,支付后不发课时)' })
  createDeposit(@TenantId() t: number, @Body() d: CreateDepositOrderDto) {
    return this.svc.createDepositOrder(t, d);
  }

  @Get('deposits')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '定金单列表(usable=已支付且未被抵扣)' })
  deposits(@TenantId() t: number, @Query('studentId') studentId?: number) {
    return this.svc.listDepositOrders(t, studentId ? Number(studentId) : undefined);
  }

  @Post('deposit/:id/convert-preview')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '定金转正式订单试算(抵扣后应付/还需补款)' })
  previewConvert(@TenantId() t: number, @Param('id') id: number, @Body() d: ConvertDepositDto) {
    return this.svc.previewDepositConvert(t, Number(id), d);
  }

  @Post('deposit/:id/convert')
  @RequirePermissions('order:create')
  @OperationLog({ action: 'order:convert-deposit', target: 'orders' })
  @ApiOperation({ summary: '定金转正式订单(抵扣定金+结转已付,付清即发课时)' })
  convert(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: ConvertDepositDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.convertDeposit(t, Number(id), d, u.id);
  }

  @Get(':id')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '订单详情(含订单项/支付/退费)' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getOrder(t, id);
  }

  @Post(':id/pay')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'order:pay', target: 'orders' })
  @ApiOperation({ summary: '支付(成功后自动发放课时)' })
  pay(@TenantId() t: number, @Param('id') id: number, @Body() d: PayOrderDto, @CurrentUser() u: AuthUser) {
    return this.svc.payOrder(t, id, d, u.id);
  }

  @Post(':id/refund')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'order:refund', target: 'orders' })
  @ApiOperation({ summary: '申请退费(进入审批中心,默认按消课比例扣费)' })
  refund(@TenantId() t: number, @Param('id') id: number, @Body() d: RefundDto, @CurrentUser() u: AuthUser) {
    return this.svc.applyRefund(t, id, d, u);
  }

  @Get(':id/refund-preview')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '退费预览(按消课比例计算可退)' })
  preview(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.previewRefund(t, id);
  }
}
