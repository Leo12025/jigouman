import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum ClassTransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DONE = 'DONE',
}

/** 转班申请（§4.4 / 资金联动）：学员从原班级转到目标班级，可带补差价 */
@Entity({ name: 'class_transfer' })
@Index(['tenantId', 'studentId'])
export class ClassTransfer extends BaseEntity {
  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'from_class_group_id', type: 'bigint', comment: '原班级' })
  fromClassGroupId: number;

  @Column({ name: 'to_class_group_id', type: 'bigint', comment: '目标班级' })
  toClassGroupId: number;

  @Column({
    name: 'diff_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: '转班补差价(资金联动，审批通过后生成系统内应收订单)',
  })
  diffAmount: number;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true, comment: '转班原因' })
  reason?: string;

  @Column({ name: 'status', length: 16, default: ClassTransferStatus.PENDING, comment: '状态' })
  status: ClassTransferStatus;

  @Column({ name: 'approval_instance_id', type: 'bigint', nullable: true, comment: '关联审批实例' })
  approvalInstanceId?: number;
}
