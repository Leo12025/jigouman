import {
  Controller, Post, Get, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OrderPageQueryDto, CreateOrderDto, PayOrderDto, RefundDto } from './dto/order.dto';
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
  @ApiOperation({ summary: '申请退费(待审批,默认按消课比例扣费)' })
  refund(@TenantId() t: number, @Param('id') id: number, @Body() d: RefundDto) {
    return this.svc.applyRefund(t, id, d);
  }

  @Get(':id/refund-preview')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '退费预览(按消课比例计算可退)' })
  preview(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.previewRefund(t, id);
  }

  @Post(':id/refund/:refundId/approve')
  @RequirePermissions('order:update')
  @OperationLog({ action: 'order:refund-approve', target: 'orders' })
  @ApiOperation({ summary: '审批退费(退款+课时回滚)' })
  approve(@TenantId() t: number, @Param('id') id: number, @Param('refundId') refundId: number, @CurrentUser() u: AuthUser) {
    return this.svc.approveRefund(t, refundId, u.id);
  }
}
