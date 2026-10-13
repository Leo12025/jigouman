import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum OrderStatus {
  PENDING = 'PENDING', // 待支付
  PAID = 'PAID', // 已支付
  COMPLETED = 'COMPLETED', // 已完成(课时耗尽)
  CANCELLED = 'CANCELLED', // 已取消
  REFUNDING = 'REFUNDING', // 退款中
  REFUNDED = 'REFUNDED', // 已退费
}

export type PayType = 'WECHAT' | 'ALIPAY' | 'OFFLINE' | 'CARD';

/**
 * 订单类型（文档 §2.4 #15 定金/订金）：
 * - NORMAL  普通订单（购课，支付后发放课时）
 * - DEPOSIT 定金单（如集训营预约定金，约定"付 200 抵 800"），支付后**不发课时**，
 *   后续转正式订单时按 depositDeductAmount 抵扣，并把已付定金结转到正式订单。
 */
export type OrderType = 'NORMAL' | 'DEPOSIT' | 'UPGRADE';

/** 金额列：数据库 decimal ↔ TS number 互转（避免字符串比较问题） */
export const MONEY: { from: (v: any) => any; to: (v: any) => any } = {
  from: (v: any) => (v === null || v === undefined ? v : Number(v)),
  to: (v: any) => v,
};

/** 订单（文档 §4.5 / §5.4） */
@Entity({ name: 'orders' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'status'])
export class Order extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'order_no', length: 32, comment: '订单号' })
  orderNo: string;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '应收合计' })
  totalAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '优惠抵扣' })
  discountAmount: number;

  @Column({ name: 'coupon_code', length: 32, nullable: true, comment: '使用的优惠券码' })
  couponCode?: string;

  @Column({ name: 'coupon_discount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, nullable: true, comment: '优惠券抵扣金额' })
  couponDiscount?: number;

  @Column({ name: 'applied_promotions', type: 'simple-json', nullable: true, comment: '促销试算命中明细(券/活动/买赠)' })
  appliedPromotions?: any;

  @Column({ name: 'payable_amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '实付应付' })
  payableAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '已收金额' })
  paidAmount: number;

  @Column({ type: 'varchar', length: 32, default: OrderStatus.PENDING, comment: '订单状态(§11.3)' })
  status: OrderStatus;

  /** 订单类型：NORMAL 普通 / DEPOSIT 定金单 */
  @Column({ name: 'order_type', length: 16, default: 'NORMAL', comment: 'NORMAL 普通/DEPOSIT 定金/UPGRADE 套餐升级补差价' })
  orderType: OrderType;

  /** 定金单：转正式订单时可抵扣的金额（付 200 抵 800 → 填 800） */
  @Column({ name: 'deposit_deduct_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '定金可抵扣金额' })
  depositDeductAmount: number;

  /** 定金单：被哪张正式订单抵扣（防同一笔定金重复使用） */
  @Column({ name: 'used_by_order_id', type: 'bigint', nullable: true, comment: '定金被抵扣的正式订单' })
  usedByOrderId?: number;

  /** 正式订单：引用的定金单 */
  @Column({ name: 'deposit_order_id', type: 'bigint', nullable: true, comment: '来源定金单' })
  depositOrderId?: number;

  @Column({ name: 'pay_type', length: 16, nullable: true, comment: '支付方式' })
  payType?: PayType;

  @Column({ name: 'owner_id', type: 'bigint', nullable: true, comment: '课程顾问/经办人' })
  ownerId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
