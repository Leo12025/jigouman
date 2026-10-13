import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { orgRepo } from '../../common/org-scope';
import { parseTenantConfig } from '../../common/compliance';
import { isReturningStudent } from '../../common/student-audience';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import { PackageItem } from '../course-package/entities/package-item.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { HourGrantType } from '../hour/entities/hour-account.entity';
import {
  Order,
  OrderStatus,
  PayType,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment, PayChannel } from './entities/payment.entity';
import { Refund, RefundStatus } from './entities/refund.entity';
import {
  OrderPageQueryDto, CreateOrderDto, PayOrderDto, RefundDto,
  CreateDepositOrderDto, ConvertDepositDto,
} from './dto/order.dto';
import { HourService } from '../../modules/hour/hour.service';
import { CouponService } from '../../modules/coupon/coupon.service';
import { StudentService } from '../../modules/student/student.service';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { approvalEvents, ApprovalEventPayload } from '../../common/approval-events';
import { orderEvents, OrderPaidPayload } from '../../common/order-events';
import { ApprovalService } from '../approval/approval.service';

function genOrderNo(): string {
  return `NO${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** 解析学员人群标签（DB 存为 JSON 字符串） */
function parseTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const v = JSON.parse(tags);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

@Injectable()
export class OrderService implements OnModuleInit {
  constructor(
    @InjectRepository(Order) orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) payRepo: Repository<Payment>,
    @InjectRepository(Refund) refundRepo: Repository<Refund>,
    @InjectRepository(CoursePackage) pkgRepo: Repository<CoursePackage>,
    @InjectRepository(PackageItem) subItemRepo: Repository<PackageItem>,
    @InjectRepository(Tenant) tenantRepo: Repository<Tenant>,
    private readonly hourSvc: HourService,
    private readonly couponSvc: CouponService,
    private readonly studentSvc: StudentService,
    private readonly approvalSvc: ApprovalService,
  ) {
    // 套用校区隔离：读自动过滤 org_id、写自动落 org_id 章
    this.orderRepo = orgRepo(orderRepo);
    this.itemRepo = orgRepo(itemRepo);
    this.payRepo = orgRepo(payRepo);
    this.refundRepo = orgRepo(refundRepo);
    this.pkgRepo = orgRepo(pkgRepo);
    this.subItemRepo = orgRepo(subItemRepo);
    this.tenantRepo = tenantRepo;
  }
  private readonly orderRepo: Repository<Order>;
  private readonly itemRepo: Repository<OrderItem>;
  private readonly payRepo: Repository<Payment>;
  private readonly refundRepo: Repository<Refund>;
  private readonly pkgRepo: Repository<CoursePackage>;
  private readonly subItemRepo: Repository<PackageItem>;
  private readonly tenantRepo: Repository<Tenant>;

  async createOrder(tenantId: number, d: CreateOrderDto) {
    if (!d.items?.length) throw new BusinessException(ResCode.BAD_REQUEST, '订单至少需要一个订单项');

    // 人群资格校验（§2.4 #17）：老生续费专享包 / 新签专享包
    const orderedPkgIds = d.items
      .map((it) => (it as any).packageId)
      .filter((x) => x != null)
      .map((x) => Number(x));
    if (orderedPkgIds.length) {
      const pkgs = await this.pkgRepo.find({ where: { tenantId, id: In(orderedPkgIds) } as any });
      const returning = await isReturningStudent(this.orderRepo, tenantId, d.studentId);
      for (const p of pkgs) {
        if (p.audience === 'RETURNING' && !returning) {
          throw new BusinessException(
            ResCode.BAD_REQUEST,
            `套餐「${p.name}」为老生续费专享，当前学员无有效订单（非老生）`,
          );
        }
        if (p.audience === 'NEW' && returning) {
          throw new BusinessException(
            ResCode.BAD_REQUEST,
            `套餐「${p.name}」仅限新签学员，当前学员为老生`,
          );
        }
      }
    }

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
    // 促销引擎（§4.17 高级玩法）：合并全场活动 + 学员券码，按叠加/互斥规则计算
    const student = await this.studentSvc.getStudent(tenantId, d.studentId).catch(() => null);
    const studentTags = parseTags(student?.tags);
    const codes = d.couponCodes || (d.couponCode ? [d.couponCode] : []);
    const promo = await this.couponSvc.calcPromotion(tenantId, {
      amount: total,
      items: d.items.map((it) => ({
        courseId: it.courseId,
        classGroupId: (it as any).classGroupId,
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
      studentTags,
      codes,
      includeAuto: true,
    });
    const couponDiscount = promo.totalDiscount;
    const discount = Math.round(((d.discountAmount || 0) + couponDiscount) * 100) / 100;
    const payable = Math.max(0, Math.round((total - discount) * 100) / 100);

    const order = this.orderRepo.create({
      tenantId,
      orderNo: genOrderNo(),
      studentId: d.studentId,
      totalAmount: total,
      discountAmount: discount,
      couponCode: codes.length ? codes.join(',') : undefined,
      couponDiscount,
      appliedPromotions: promo.applied as any,
      payableAmount: payable,
      paidAmount: 0,
      status: OrderStatus.PENDING,
      ownerId: d.ownerId,
      remark: d.remark,
    } as any);
    const saved = await this.orderRepo.save(order as any);

    for (const it of items) it.orderId = saved.id;
    // 买赠：将赠品写入订单项(单价0)
    const giftItems = (promo.giftItems || []).map((g: any) =>
      this.itemRepo.create({
        tenantId,
        orderId: saved.id,
        courseId: g.courseId,
        itemType: 'GIFT',
        name: g.name,
        qty: g.qty,
        unitPrice: 0,
        amount: 0,
        hours: 0,
      } as any),
    );
    await this.itemRepo.save([...items, ...giftItems] as any[]);

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

    // 优惠券核销：支付成功后批量标记已用（§4.17 多券/券+活动）
    if (order.couponCode) {
      const courseId = items[0]?.courseId;
      const codes = order.couponCode.split(',').filter(Boolean);
      await this.couponSvc.redeemMany(tenantId, codes, order.id, Number(order.payableAmount))
        .catch(() => undefined);
    }

    // 定金单不发课时（转正式订单时才发放）
    if (order.orderType !== 'DEPOSIT') {
      await this.grantItems(tenantId, order, items, operatorId);
    }

    // 支付成功事件：供下游业务联动（如套餐升级补差价付清后自动执行升级）
    orderEvents.emit('order.paid', {
      tenantId,
      orderId: id,
      orderType: order.orderType,
    } as OrderPaidPayload);

    return this.getOrder(tenantId, id);
  }

  /** 按订单项发放课时（定金单不调用） */
  private async grantItems(
    tenantId: number,
    order: Order,
    items: OrderItem[],
    operatorId?: number,
  ) {
    for (const it of items) {
      if (it.hours > 0) {
        await this.grantByItem(tenantId, order, it, operatorId);
      }
    }
  }

  /**
   * 支付发放（文档 §3.2）：按套餐 consume_mode 路由到不同账户模型，
   * 并补齐此前缺失的有效期 / 课时单价 / 赠课标记 / 来源订单项（退费精确匹配用）。
   */
  private async grantByItem(tenantId: number, order: Order, it: OrderItem, operatorId?: number) {
    const hours = Number(it.hours) || 0;
    const perHour = hours > 0 ? r2(Number(it.amount) / hours) : 0;
    const grantType: HourGrantType = it.itemType === 'GIFT' ? 'GIFT' : 'PAID';
    const pkg = it.packageId
      ? await this.pkgRepo.findOne({ where: { tenantId, id: Number(it.packageId) } as any })
      : null;
    const validDays = pkg?.validDays ?? undefined;
    const base = {
      studentId: order.studentId,
      hours,
      operatorId,
      refOrderId: order.id,
      orderItemId: it.id,
      remark: it.name,
      unitValue: perHour,
      validDays,
      grantType,
    };

    // BY_TIME：时间型权益（年卡/月卡/托班时段卡，有效期内不限次）
    if (pkg?.consumeMode === 'BY_TIME') {
      return this.hourSvc.grantEntitlement(tenantId, {
        studentId: order.studentId,
        packageId: pkg.id,
        courseId: it.courseId,
        expireAt: addDays(new Date(), validDays && validDays > 0 ? validDays : 30),
        refOrderId: order.id,
        operatorId,
        remark: it.name,
      });
    }

    // BY_PERIOD：期课报名（绑定班期，按课次出勤，不逐次建课时账户）
    if (pkg?.consumeMode === 'BY_PERIOD') {
      return this.hourSvc.enroll(tenantId, {
        studentId: order.studentId,
        classGroupId: pkg.classGroupId,
        courseId: it.courseId,
        packageId: pkg.id,
        refOrderId: order.id,
        totalLessons: hours,
      });
    }

    // BY_HOUR 组合套餐：按子项拆分，每门课各自固定课时（Scratch 用完不能拿 Python 的补）
    if (pkg?.sellType === 'COMBO') {
      const subs = await this.subItemRepo.find({ where: { tenantId, packageId: pkg.id } as any });
      if (subs.length && subs.every((s) => (s.hours || 0) > 0)) {
        const out: any[] = [];
        for (const s of subs) {
          out.push(
            await this.hourSvc.grant(tenantId, {
              ...base,
              courseId: Number(s.courseId),
              packageId: pkg.id,
              type: 'CLASS',
              hours: Number(s.hours),
            }),
          );
        }
        return out;
      }
    }

    // BY_HOUR 课包：课包账户（可跨套餐内课程抵扣）
    if (pkg) {
      return this.hourSvc.grant(tenantId, { ...base, type: 'GENERAL', packageId: pkg.id });
    }
    // 普通课程：课程专属账户
    return this.hourSvc.grant(tenantId, { ...base, courseId: it.courseId, type: 'CLASS' });
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

  /** 违约金比例（因学员原因提前退学，按未消耗余额扣违约金；租户级可配，默认 0） */
  private async penaltyRate(tenantId: number): Promise<number> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } as any });
    const cfg = parseTenantConfig(t?.config);
    const n = Number(cfg.refundPenaltyRate ?? process.env.REFUND_PENALTY_RATE ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.min(1, n) : 0;
  }

  /**
   * 退费预览（文档 §4.3，严格对齐示范合同计算口径）：
   * - 按课时：已消费 = 培训费 ÷ 总课时 × 实际消费课时
   * - 按周期：已消费 = 培训费 ÷ 总天数 × 实际消费天数
   * - 赠课不退、不计入可退金额；7 日内未消费无条件全额退
   */
  async previewRefund(tenantId: number, id: number) {
    const order = await this.orderRepo.findOne({ where: { tenantId, id } as any });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.itemRepo.find({ where: { tenantId, orderId: id } as any });
    const studentId = Number(order.studentId);
    const accounts = (await this.hourSvc.balance(tenantId, studentId)) as any[];

    const pkgIds = items.map((it) => (it.packageId ? Number(it.packageId) : 0)).filter((x) => x > 0);
    const pkgs = pkgIds.length
      ? await this.pkgRepo.find({ where: { tenantId, id: In(pkgIds) } as any })
      : [];
    const pkgOf = (pid?: number) => pkgs.find((p) => Number(p.id) === Number(pid));

    let totalHours = 0;
    let remainingHours = 0;
    let consumedHours = 0;
    let refundable = 0;
    const detail: any[] = [];

    for (const it of items) {
      const hours = Number(it.hours) || 0;
      const amount = Number(it.amount) || 0;
      if (hours <= 0) {
        detail.push({ name: it.name, hours: 0, refundable: 0, note: '非课时项' });
        continue;
      }
      const pkg = pkgOf(it.packageId);
      const mode = pkg?.consumeMode || 'BY_HOUR';
      const unitPrice = r2(amount / hours);

      // 按周期收费：培训费 ÷ 总天数 × 实际消费天数
      if (mode === 'BY_TIME') {
        const ents = (await this.hourSvc.listEntitlements(tenantId, studentId)) as any[];
        const ent = ents.find((e) => Number(e.packageId || 0) === Number(it.packageId || 0));
        const start = ent?.startAt ? new Date(ent.startAt).getTime() : Date.now();
        const end = ent?.expireAt ? new Date(ent.expireAt).getTime() : start + 30 * 86400_000;
        const totalDays = Math.max(1, Math.round((end - start) / 86400_000));
        const usedDays = Math.min(totalDays, Math.max(0, Math.round((Date.now() - start) / 86400_000)));
        const itemRefund = r2(amount * Math.max(0, 1 - usedDays / totalDays));
        refundable = r2(refundable + itemRefund);
        detail.push({ name: it.name, mode, totalDays, usedDays, amount, refundable: itemRefund });
        continue;
      }

      // 按期：按已出勤课次占比扣减
      if (mode === 'BY_PERIOD') {
        const enrolls = (await this.hourSvc.listEnrollments(tenantId, studentId)) as any[];
        const en = enrolls.find((e) => Number(e.packageId || 0) === Number(it.packageId || 0));
        const total = Number(en?.totalLessons || 0) || hours;
        const attended = Number(en?.attendedLessons || 0);
        const remainLessons = Math.max(0, total - attended);
        const itemRefund = r2((amount / Math.max(1, total)) * remainLessons);
        refundable = r2(refundable + itemRefund);
        remainingHours += remainLessons;
        consumedHours += attended;
        detail.push({ name: it.name, mode, totalLessons: total, attended, refundable: itemRefund });
        continue;
      }

      // BY_HOUR：精确匹配来源账户（优先 orderItemId，其次 packageId/courseId），赠课不计入
      const byItem = accounts.filter((a) => Number(a.orderItemId || 0) === Number(it.id));
      const pool = byItem.length
        ? byItem
        : accounts.filter((a) =>
            it.packageId != null
              ? Number(a.packageId || 0) === Number(it.packageId)
              : Number(a.courseId || 0) === Number(it.courseId || 0),
          );
      const remain = Math.min(
        hours,
        pool
          .filter((a) => !a.isGranted && a.status !== 'CLOSED')
          .reduce((s, a) => s + (Number(a.balance) || 0), 0),
      );
      const consumed = hours - remain;
      const itemRefund = r2(remain * unitPrice);
      totalHours += hours;
      remainingHours += remain;
      consumedHours += consumed;
      refundable = r2(refundable + itemRefund);
      detail.push({
        courseId: it.courseId, name: it.name, mode, hours, unitPrice,
        remainingHours: remain, consumedHours: consumed, refundable: itemRefund,
      });
    }

    // 7 日内未消费：无条件全额退（示范合同）
    const payments = await this.payRepo.find({
      where: { tenantId, orderId: id } as any,
      order: { id: 'ASC' } as any,
    });
    const firstPaidAt = payments[0]?.paidAt ? new Date(payments[0].paidAt as any).getTime() : 0;
    const within7Days = firstPaidAt > 0 && Date.now() - firstPaidAt <= 7 * 86400_000;
    if (within7Days && consumedHours === 0) {
      refundable = r2(Number(order.paidAmount));
    }

    // 因学员原因提前退学：按未消耗余额扣违约金
    const rate = await this.penaltyRate(tenantId);
    let penalty = 0;
    if (rate > 0 && consumedHours > 0) {
      penalty = r2(refundable * rate);
      refundable = Math.max(0, r2(refundable - penalty));
    }

    return {
      orderId: id,
      paidAmount: Number(order.paidAmount),
      totalHours,
      remainingHours,
      consumedHours,
      refundable,
      penaltyRate: rate,
      penalty,
      within7Days,
      detail,
    };
  }

  async applyRefund(tenantId: number, id: number, d: RefundDto, applicant: AuthUser) {
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
    // 资金联动：默认走已配置的审批流模板；未配置时退化为单节点审批人(兜底)
    const inst = await this.approvalSvc.createByBizType(tenantId, {
      bizType: 'REFUND',
      bizId: saved.id,
      title: `退款申请-订单${id}-金额${saved.amount}元`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.refundRepo.save(saved as any);
    return saved;
  }

  // ---------------- 审批中心联动回写（事件驱动，避免循环依赖） ----------------
  onModuleInit() {
    approvalEvents.on('approval.approved', (p: ApprovalEventPayload) => {
      if (p.bizType === 'REFUND') this.applyRefundEffect(p.tenantId, p.bizId).catch(() => undefined);
    });
    approvalEvents.on('approval.rejected', (p: ApprovalEventPayload) => {
      if (p.bizType === 'REFUND') this.revertRefund(p.tenantId, p.bizId).catch(() => undefined);
    });
  }

  /** 审批通过后回写：退款生效 + 课时回滚 + 订单置已退费 */
  async applyRefundEffect(tenantId: number, refundId?: number) {
    if (!refundId) return;
    const refund = await this.refundRepo.findOne({ where: { tenantId, id: refundId } as any });
    if (!refund || refund.status !== RefundStatus.PENDING) return;
    refund.status = RefundStatus.REFUNDED;
    refund.approvedAt = new Date();
    await this.refundRepo.save(refund as any);
    const order = await this.orderRepo.findOne({ where: { tenantId, id: refund.orderId } as any });
    if (order) {
      order.status = OrderStatus.REFUNDED;
      await this.orderRepo.save(order as any);
    }
    // 退费必须触发课时回滚，防止资损；部分退费按比例回滚
    // （此前无条件全额回滚，导致"只退部分钱却清零全部课时"，学员侧纠纷）
    const preview = await this.previewRefund(tenantId, refund.orderId).catch(() => null);
    const ratio =
      preview && preview.refundable > 0
        ? Math.min(1, Number(refund.amount) / preview.refundable)
        : 1;
    await this.hourSvc.rollbackByOrder(tenantId, refund.orderId, ratio, undefined);
  }

  /** 审批驳回后回写：退款单置驳回，订单退回已支付 */
  async revertRefund(tenantId: number, refundId?: number) {
    if (!refundId) return;
    const refund = await this.refundRepo.findOne({ where: { tenantId, id: refundId } as any });
    if (!refund || refund.status !== RefundStatus.PENDING) return;
    refund.status = RefundStatus.REJECTED;
    await this.refundRepo.save(refund as any);
    const order = await this.orderRepo.findOne({ where: { tenantId, id: refund.orderId } as any });
    if (order && order.status === OrderStatus.REFUNDING) {
      order.status = OrderStatus.PAID;
      await this.orderRepo.save(order as any);
    }
  }

  // ---------------- 定金 / 订金（§2.4 #15） ----------------

  /**
   * 创建定金单：仅收款，**不发课时**。
   * deductAmount = 转正式订单时的抵扣额（付 200 抵 800 → 填 800）；不传则等于定金金额。
   */
  async createDepositOrder(tenantId: number, d: CreateDepositOrderDto) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '定金金额必须大于 0');
    const deduct = d.deductAmount != null ? r2(Number(d.deductAmount)) : amount;

    const order = this.orderRepo.create({
      tenantId,
      orderNo: genOrderNo(),
      studentId: d.studentId,
      totalAmount: amount,
      discountAmount: 0,
      payableAmount: amount,
      paidAmount: 0,
      status: OrderStatus.PENDING,
      orderType: 'DEPOSIT',
      depositDeductAmount: deduct,
      ownerId: d.ownerId,
      remark: d.remark,
    } as any);
    const saved = await this.orderRepo.save(order as any);
    await this.itemRepo.save(
      this.itemRepo.create({
        tenantId,
        orderId: saved.id,
        courseId: d.courseId ?? 0,
        itemType: 'DEPOSIT',
        packageId: d.packageId,
        name: d.name || '定金',
        qty: 1,
        unitPrice: amount,
        amount,
        hours: 0, // 定金不发课时
      } as any),
    );
    return this.getOrder(tenantId, saved.id);
  }

  /** 定金单列表（usable = 已支付且未被抵扣） */
  async listDepositOrders(tenantId: number, studentId?: number) {
    const where: any = { tenantId, orderType: 'DEPOSIT' };
    if (studentId) where.studentId = studentId;
    const list = await this.orderRepo.find({ where, order: { id: 'DESC' } as any });
    return list.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      studentId: o.studentId,
      paidAmount: Number(o.paidAmount),
      depositDeductAmount: Number(o.depositDeductAmount),
      status: o.status,
      usedByOrderId: o.usedByOrderId ?? null,
      usable: o.status === OrderStatus.PAID && !o.usedByOrderId,
    }));
  }

  /** 转正式订单前的定金校验 */
  private async getDepositForConvert(tenantId: number, depositOrderId: number) {
    const dep = await this.orderRepo.findOne({ where: { tenantId, id: depositOrderId } as any });
    if (!dep) throw new NotFoundException('定金单不存在');
    if (dep.orderType !== 'DEPOSIT') {
      throw new BusinessException(ResCode.BAD_REQUEST, '该订单不是定金单');
    }
    if (dep.status !== OrderStatus.PAID) {
      throw new BusinessException(ResCode.BAD_REQUEST, '定金单未支付，不可转正式订单');
    }
    if (dep.usedByOrderId) {
      throw new BusinessException(ResCode.BAD_REQUEST, '该定金已被使用，不可重复抵扣');
    }
    return dep;
  }

  /** 试算：正式订单金额 - 定金抵扣额 */
  private async previewOrderAmount(tenantId: number, studentId: number, d: ConvertDepositDto) {
    let total = 0;
    for (const it of d.items) total = r2(total + it.qty * it.unitPrice);
    const student = await this.studentSvc.getStudent(tenantId, studentId).catch(() => null);
    const codes = d.couponCodes || (d.couponCode ? [d.couponCode] : []);
    const promo = await this.couponSvc
      .calcPromotion(tenantId, {
        amount: total,
        items: d.items.map((it) => ({
          courseId: it.courseId,
          classGroupId: (it as any).classGroupId,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
        studentTags: parseTags(student?.tags),
        codes,
        includeAuto: true,
      })
      .catch(() => null as any);
    const couponDiscount = promo?.totalDiscount || 0;
    const discount = r2((d.discountAmount || 0) + couponDiscount);
    return {
      totalAmount: total,
      discountAmount: discount,
      couponDiscount,
      payableAmount: Math.max(0, r2(total - discount)),
    };
  }

  /** 定金转正式订单试算（抵扣后应付、抵扣后仍需补款） */
  async previewDepositConvert(tenantId: number, depositOrderId: number, d: ConvertDepositDto) {
    const dep = await this.getDepositForConvert(tenantId, depositOrderId);
    const quote = await this.previewOrderAmount(tenantId, dep.studentId, d);
    const deduct = Number(dep.depositDeductAmount) || Number(dep.paidAmount) || 0;
    const payable = Math.max(0, r2(Number(quote.payableAmount) - deduct));
    const carried = Number(dep.paidAmount) || 0;
    return {
      depositOrderId: dep.id,
      depositPaidAmount: r2(carried),
      deductAmount: r2(deduct),
      totalAmount: quote.totalAmount,
      discountAmount: quote.discountAmount,
      payableAmount: payable,
      afterDepositPayable: Math.max(0, r2(payable - carried)),
    };
  }

  /**
   * 定金转正式订单：
   * 1) 复用下单逻辑（含人群资格与合规校验）
   * 2) 抵扣 depositDeductAmount（付 200 抵 800）
   * 3) 定金已付金额结转到正式订单（生成"定金结转"收款流水，便于对账）
   * 4) 已付清即发放课时
   * 5) 定金单置 COMPLETED 并记录 usedByOrderId，防重复使用
   */
  async convertDeposit(
    tenantId: number,
    depositOrderId: number,
    d: ConvertDepositDto,
    operatorId?: number,
  ) {
    const dep = await this.getDepositForConvert(tenantId, depositOrderId);
    const created: any = await this.createOrder(tenantId, {
      studentId: dep.studentId,
      items: d.items,
      discountAmount: d.discountAmount,
      couponCode: d.couponCode,
      couponCodes: d.couponCodes,
      ownerId: d.ownerId,
      remark: d.remark,
    } as CreateOrderDto);

    const order = await this.orderRepo.findOne({ where: { tenantId, id: created.id } as any });
    if (!order) throw new NotFoundException('订单不存在');

    // 抵扣定金
    const deduct = Number(dep.depositDeductAmount) || Number(dep.paidAmount) || 0;
    const discount = r2(Number(order.discountAmount) + deduct);
    const payable = Math.max(0, r2(Number(order.totalAmount) - discount));
    order.discountAmount = discount;
    order.payableAmount = payable;
    order.depositOrderId = dep.id;
    await this.orderRepo.save(order as any);

    // 结转定金已付金额
    const carried = Number(dep.paidAmount) || 0;
    if (carried > 0) {
      await this.payRepo.save(
        this.payRepo.create({
          tenantId,
          orderId: order.id,
          channel: 'OTHER' as PayChannel,
          amount: carried,
          tradeNo: `DEPOSIT-${dep.orderNo}`,
          status: 'SUCCESS',
          operatorId,
          paidAt: new Date(),
        } as any),
      );
      order.paidAmount = r2(Number(order.paidAmount) + carried);
      if (order.paidAmount >= order.payableAmount) order.status = OrderStatus.PAID;
      await this.orderRepo.save(order as any);
    }

    // 已付清则发放课时（此时才真正发课时，定金阶段不发）
    if (order.status === OrderStatus.PAID) {
      const items = await this.itemRepo.find({ where: { tenantId, orderId: order.id } as any });
      await this.grantItems(tenantId, order, items, operatorId);
    }

    // 标记定金已使用
    dep.usedByOrderId = order.id;
    dep.status = OrderStatus.COMPLETED;
    await this.orderRepo.save(dep as any);

    return this.getOrder(tenantId, order.id);
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
