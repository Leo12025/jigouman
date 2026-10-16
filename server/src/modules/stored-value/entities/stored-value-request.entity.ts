import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 储值资金操作类型（资金联动，需经审批中心，§4.16/§9.5） */
export enum StoredValueRequestType {
  RECHARGE = 'RECHARGE', // 储值充值（预收费归集）
  REFUND = 'REFUND', // 退费退回储值（仅本金）
}

/** 储值资金操作审批状态 */
export enum StoredValueRequestStatus {
  PENDING = 'PENDING', // 待审批
  APPROVED = 'APPROVED', // 已批准（执行中/已执行）
  DONE = 'DONE', // 已执行（余额已变更）
  REJECTED = 'REJECTED', // 已驳回（未变更余额）
}

/**
 * 储值资金操作审批请求：
 * 充值/退回储值均先落 PENDING 并进入审批中心，审批通过后由事件总线回写真实余额变更，
 * 驳回则余额保持不变，规避资损（与 调课/转班/套餐升级/退费 统一审批模式一致）。
 */
@Entity({ name: 'stored_value_request' })
export class StoredValueRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 16, comment: '操作类型 RECHARGE/REFUND' })
  type: StoredValueRequestType;

  @Column({ type: 'bigint', comment: '学员ID' })
  studentId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: '金额（元）' })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, comment: '赠送金额（仅充值）' })
  giftAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;

  @Column({ type: 'bigint', nullable: true, comment: '关联订单ID（退回储值/充值来源）' })
  refOrderId?: number;

  @Column({ type: 'bigint', nullable: true, comment: '发起人' })
  operatorId?: number;

  @Column({ type: 'varchar', length: 16, default: StoredValueRequestStatus.PENDING, comment: '审批状态' })
  status: StoredValueRequestStatus;

  @Column({ type: 'bigint', nullable: true, comment: '审批实例ID' })
  approvalInstanceId?: number;

  @Column({ type: 'datetime', nullable: true, comment: '执行时间' })
  executedAt?: Date;
}
