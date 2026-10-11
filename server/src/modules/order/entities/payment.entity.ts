import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from './order.entity';

export type PayChannel = 'WECHAT' | 'ALIPAY' | 'OFFLINE' | 'CARD' | 'OTHER';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED';

/** 支付记录（文档 §5.4） */
@Entity({ name: 'payment' })
@Index(['tenantId', 'orderId'])
export class Payment extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'order_id', type: 'bigint', comment: '订单' })
  orderId: number;

  @Column({ name: 'channel', length: 16, comment: '支付渠道' })
  channel: PayChannel;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '支付金额' })
  amount: number;

  @Column({ name: 'trade_no', length: 64, nullable: true, comment: '第三方交易号' })
  tradeNo?: string;

  @Column({ name: 'status', length: 16, default: 'SUCCESS', comment: '支付状态' })
  status: PaymentStatus;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '经办人' })
  operatorId?: number;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true, comment: '支付时间' })
  paidAt?: Date;
}
