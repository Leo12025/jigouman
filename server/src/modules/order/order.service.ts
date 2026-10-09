import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import {
  Order,
  OrderStatus,
  PayType,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment, PayChannel } from './entities/payment.entity';
import { Refund, RefundStatus } from './entities/refund.entity';
import { OrderPageQueryDto, CreateOrderDto, PayOrderDto, RefundDto } from './dto/order.dto';
import { HourService } from '../../modules/hour/hour.service';

function genOrderNo(): string {
  return `NO${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly payRepo: Repository<Payment>,
    @InjectRepository(Refund) private readonly refundRepo: Repository<Refund>,
    private readonly hourSvc: HourService,
  ) {}

  async createOrder(tenantId: number, d: CreateOrderDto) {
    if (!d.items?.length) throw new BusinessException(ResCode.BAD_REQUEST, '订单至少需要一个订单项');
    let total = 0;
    const items = d.items.map((it) => {
      const amount = Math.round(it.qty * it.unitPrice * 100) / 100;
      total = Math.round((total + amount) * 100) / 100;
      const plain = {
        tenantId,
        orderId: 0,
        courseId: it.courseId,
        itemType: it.itemType || 'COURSE',
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        amount,
        hours: it.hours || 0,
      } as OrderItem;
      return this.itemRepo.create(plain);
    });
    const discount = d.discountAmount || 0;
    const payable = Math.max(0, Math.round((total - discount) * 100) / 100);

    const order = this.orderRepo.create({
      tenantId,
      orderNo: genOrderNo(),
      studentId: d.studentId,
      totalAmount: total,
      discountAmount: discount,
      payableAmount: payable,
      paidAmount: 0,
      status: OrderStatus.PENDING,
      ownerId: d.ownerId,
      remark: d.remark,
    } as any);
    const saved = await this.orderRepo.save(order as any);

    for (const it of items) it.orderId = saved.id;
    await this.itemRepo.save(items as any[]);

    return this.getOrder(tenantId, saved.id);
  }

  async payOrder(tenantId: number, id: number, d: PayOrderDto, operatorId?: number) {
    const order = await this.orderRepo.findOne({ where: { tenantId, id } as any });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING) {
      throw new BusinessException(ResCode.BAD_REQUEST, '仅待支付订单可支付');
    }
    const amount = d.amount ?? order.payableAmount;
    const payment = this.payRepo.create({
      tenantId,
      orderId: id,
      channel: d.channel,
      amount,
      tradeNo: d.tradeNo,
      status: 'SUCCESS',
      operatorId,
      paidAt: new Date(),
    } as any);
    await this.payRepo.save(payment as any);

    order.paidAmount = Math.round((Number(order.paidAmount) + amount) * 100) / 100;
    if (order.paidAmount >= order.payableAmount) order.status = OrderStatus.PAID;
    order.payType = (d.payType || d.channel) as PayType;
    await this.orderRepo.save(order as any);

    // 支付成功 → 按订单项发放课时到学员账户
    const items = await this.itemRepo.find({ where: { tenantId, orderId: id } as any });
    for (const it of items) {
      if (it.hours > 0) {
        const perHour = Math.round((Number(it.amount) / it.hours) * 100) / 100;
        if (it.itemType === 'HOUR_PACK' && it.packageId) {
          // 课包订单：发放到学员"课包账户"(courseId=null, packageId=套餐)，可跨套餐内课程抵扣
          await this.hourSvc.grant(tenantId, {
            studentId: order.studentId,
            type: 'GENERAL',
            hours: it.hours,
            packageId: Number(it.packageId),
            operatorId,
            refOrderId: order.id,
            remark: it.name,
            unitValue: perHour,
          });
        } else {
          await this.hourSvc.grant(tenantId, {
            studentId: order.studentId,
            courseId: it.courseId,
            type: 'CLASS',
            hours: it.hours,
            operatorId,
            refOrderId: order.id,
            remark: it.name,
            unitValue: perHour,
          });
        }
      }
    }
    return this.getOrder(tenantId, id);
  }

  async getOrder(tenantId: number, id: number) {
    const order = await this.orderRepo.findOne({ where: { tenantId, id } as any });
    if (!order) throw new NotFoundException('订单不存在');
    const [items, payments, refunds] = await Promise.all([
      this.itemRepo.find({ where: { tenantId, orderId: id } as any, order: { id: 'ASC' } as any }),
      this.payRepo.find({ where: { tenantId, orderId: id } as any, order: { id: 'ASC' } as any }),
      this.refundRepo.find({ where: { tenantId, orderId: id } as any, order: { id: 'ASC' } as any }),
    ]);
    return { ...(order as any), items, payments, refunds };
  }

  /** 退费预览：按消课比例计算可退金额（文档 §4.5「按消课比例扣费」） */
  async previewRefund(tenantId: number, id: number) {
    const order = await this.orderRepo.findOne({ where: { tenantId, id } as any });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.itemRepo.find({ where: { tenantId, orderId: id } as any });
    // bigint 列在 SQLite 下可能以字符串返回，统一转 Number 再查询/比较
    const studentId = Number(order.studentId);
    const balances = (await this.hourSvc.balance(tenantId, studentId)) as any[];
    const balOf = (courseId?: number) =>
      balances.find((b) => Number(b.courseId ?? 0) === Number(courseId ?? 0))?.balance ?? 0;

    let totalHours = 0;
    let remainingHours = 0;
    let consumedHours = 0;
    let refundable = 0;
    const detail = items.map((it) => {
      const hours = Number(it.hours) || 0;
      const unitPrice = hours > 0 ? Math.round((Number(it.amount) / hours) * 100) / 100 : 0;
      const remain = hours > 0 ? Math.min(hours, balOf(it.courseId)) : 0;
      const consumed = hours - remain;
      const itemRefund = Math.round(remain * unitPrice * 100) / 100;
      totalHours += hours;
      remainingHours += remain;
      consumedHours += consumed;
      refundable = Math.round((refundable + itemRefund) * 100) / 100;
      return {
        courseId: it.courseId,
        name: it.name,
        hours,
        unitPrice,
        remainingHours: remain,
        consumedHours: consumed,
        refundable: itemRefund,
      };
    });
    return {
      orderId: id,
      paidAmount: Number(order.paidAmount),
      totalHours,
      remainingHours,
      consumedHours,
      refundable,
    };
  }

  async applyRefund(tenantId: number, id: number, d: RefundDto) {
    const order = await this.orderRepo.findOne({ where: { tenantId, id } as any });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.COMPLETED) {
      throw new BusinessException(ResCode.BAD_REQUEST, '仅已支付/已完成订单可申请退费');
    }
    // 按消课比例计算默认可退金额；未传 amount 时使用
    const preview = await this.previewRefund(tenantId, id).catch(() => null);
    const amount = d.amount ?? (preview ? preview.refundable : 0);
    if (amount > Number(order.paidAmount) + 0.001) {
      throw new BusinessException(ResCode.BAD_REQUEST, '退费金额不能超过已付金额');
    }
    if (preview && amount > preview.refundable + 0.001) {
      throw new BusinessException(ResCode.BAD_REQUEST, '退费金额超过可退余额(已按消课比例扣费)');
    }
    const refund = this.refundRepo.create({
      tenantId,
      orderId: id,
      studentId: order.studentId,
      amount: Math.round(amount * 100) / 100,
      reason: d.reason,
      status: RefundStatus.PENDING,
    } as any);
    const saved = await this.refundRepo.save(refund as any);
    order.status = OrderStatus.REFUNDING;
    await this.orderRepo.save(order as any);
    return saved;
  }

  async approveRefund(tenantId: number, refundId: number, operatorId?: number) {
    const refund = await this.refundRepo.findOne({ where: { tenantId, id: refundId } as any });
    if (!refund) throw new NotFoundException('退费单不存在');
    if (refund.status !== RefundStatus.PENDING) {
      throw new BusinessException(ResCode.BAD_REQUEST, '仅待审批退费单可处理');
    }
    refund.status = RefundStatus.REFUNDED;
    refund.approverId = operatorId;
    refund.approvedAt = new Date();
    await this.refundRepo.save(refund as any);

    const order = await this.orderRepo.findOne({ where: { tenantId, id: refund.orderId } as any });
    if (order) {
      order.status = OrderStatus.REFUNDED;
      await this.orderRepo.save(order as any);
    }
    // 退费必须触发课时回滚，防止资损
    await this.hourSvc.rollbackByOrder(tenantId, refund.orderId, operatorId);
    return { refund, order: order ? (order as any) : null };
  }

  async listOrders(tenantId: number, q: OrderPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.studentId) where.studentId = q.studentId;
    if (q.keyword) where.orderNo = q.keyword; // 简化：精确匹配订单号
    const [list, total] = await this.orderRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }
}
