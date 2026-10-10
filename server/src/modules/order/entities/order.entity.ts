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

  @Column({ name: 'payable_amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '实付应付' })
  payableAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '已收金额' })
  paidAmount: number;

  @Column({ type: 'varchar', length: 32, default: OrderStatus.PENDING, comment: '订单状态(§11.3)' })
  status: OrderStatus;

  @Column({ name: 'pay_type', length: 16, nullable: true, comment: '支付方式' })
  payType?: PayType;

  @Column({ name: 'owner_id', type: 'bigint', nullable: true, comment: '课程顾问/经办人' })
  ownerId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
