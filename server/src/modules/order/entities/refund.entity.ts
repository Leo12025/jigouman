import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from './order.entity';

export enum RefundStatus {
  PENDING = 'PENDING', // 待审批
  APPROVED = 'APPROVED', // 已通过
  REJECTED = 'REJECTED', // 已驳回
  REFUNDED = 'REFUNDED', // 已退款
}

/** 退费单（文档 §4.5 / §5.4）。退费必须触发课时回滚或冻结，防止资损 */
@Entity({ name: 'refund' })
@Index(['tenantId', 'orderId'])
export class Refund extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'order_id', type: 'bigint', comment: '订单' })
  orderId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '退费金额' })
  amount: number;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true, comment: '退费原因' })
  reason?: string;

  @Column({ name: 'status', length: 16, default: RefundStatus.PENDING, comment: '退费状态' })
  status: RefundStatus;

  @Column({ name: 'approver_id', type: 'bigint', nullable: true, comment: '审批人' })
  approverId?: number;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true, comment: '审批时间' })
  approvedAt?: Date;

  @Column({ name: 'approval_instance_id', type: 'bigint', nullable: true, comment: '关联审批实例(资金联动走审批中心)' })
  approvalInstanceId?: number;
}
