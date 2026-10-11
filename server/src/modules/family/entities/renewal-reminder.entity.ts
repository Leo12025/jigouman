import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 续费提醒（文档 §5.7 / §6.6）：课时不足或到期触发，家长端可见 */
@Entity({ name: 'renewal_reminder' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'status'])
export class RenewalReminder extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'trigger_type', length: 32, default: 'LOW_HOURS', comment: '触发类型 LOW_HOURS/ EXPIRE' })
  triggerType: string;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true, comment: '发送时间' })
  sentAt?: Date;

  @Column({ length: 16, default: 'PENDING', comment: '状态 PENDING/ SENT/ DONE' })
  status: string;

  @Column({ name: 'remaining_hours', type: 'float', nullable: true, comment: '触发时剩余课时' })
  remainingHours?: number;
}
