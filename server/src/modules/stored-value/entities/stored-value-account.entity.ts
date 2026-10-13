import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export type StoredValueStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

/**
 * 储值账户（文档 §2.4 #14 储值卡 / 预存赠送）。
 *
 * 与课时账户的区别：储值是**资金账户**（余额为金额），不是课时权益；
 * 储值可用于支付任意订单，支付后再按套餐发放课时。
 * 注意：储值同样被"以充值形式变相收取"纳入监管，受 5000 元上限约束。
 *
 * gift_balance 记录余额中的**赠送部分**：赠送金额不提现、退费时不退，
 * 消费时优先扣赠送（与赠课优先消耗口径一致）。
 */
@Entity({ name: 'stored_value_account' })
@Index(['tenantId', 'studentId'])
export class StoredValueAccount extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  /** 可用余额（含赠送部分） */
  @Column({ name: 'balance', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '可用余额(含赠送)' })
  balance: number;

  /** 余额中的赠送部分（不提现、不退） */
  @Column({ name: 'gift_balance', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '其中赠送部分' })
  giftBalance: number;

  @Column({ name: 'total_recharged', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '累计充值本金' })
  totalRecharged: number;

  @Column({ name: 'total_gift', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '累计赠送' })
  totalGift: number;

  @Column({ name: 'total_used', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '累计消费' })
  totalUsed: number;

  @Column({ length: 16, default: 'ACTIVE', comment: 'ACTIVE 正常/FROZEN 冻结/CLOSED 销户' })
  status: StoredValueStatus;

  @Column({ name: 'expire_at', type: 'datetime', nullable: true, comment: '余额有效期' })
  expireAt?: Date;
}
