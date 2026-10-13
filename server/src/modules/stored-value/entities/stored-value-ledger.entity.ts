import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/** RECHARGE 充值 / GIFT 赠送 / CONSUME 消费 / REFUND 退回 / EXPIRE 过期清零 */
export type StoredValueType = 'RECHARGE' | 'GIFT' | 'CONSUME' | 'REFUND' | 'EXPIRE';

/** 储值流水：每笔充值/赠送/消费/退回可追溯（资金账户必须留痕） */
@Entity({ name: 'stored_value_ledger' })
@Index(['tenantId', 'accountId'])
@Index(['tenantId', 'studentId'])
export class StoredValueLedger extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'account_id', type: 'bigint', comment: '储值账户' })
  accountId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ length: 16, comment: 'RECHARGE/GIFT/CONSUME/REFUND/EXPIRE' })
  type: StoredValueType;

  /** 金额：正=入账，负=出账 */
  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '金额(正入账/负出账)' })
  amount: number;

  /** 本次涉及的赠送金额（正=赠送入账，负=赠送扣减） */
  @Column({ name: 'gift_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '本次赠送金额' })
  giftAmount: number;

  /** 变动后余额，便于对账 */
  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '变动后余额' })
  balanceAfter: number;

  @Column({ name: 'ref_order_id', type: 'bigint', nullable: true, comment: '关联订单' })
  refOrderId?: number;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '操作人' })
  operatorId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
