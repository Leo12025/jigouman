import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 调课申请（§4.1 / 资金联动）：调整某课次的上课时间/老师，需审批 */
@Entity({ name: 'lesson_reschedule' })
@Index(['tenantId', 'lessonId'])
export class LessonReschedule extends BaseEntity {
  @Column({ name: 'lesson_id', type: 'bigint', comment: '课次' })
  lessonId: number;

  @Column({ name: 'new_start_time', type: 'datetime', comment: '新开始时间' })
  newStartTime: Date;

  @Column({ name: 'new_end_time', type: 'datetime', comment: '新结束时间' })
  newEndTime: Date;

  @Column({ name: 'new_teacher_id', type: 'bigint', nullable: true, comment: '新授课老师' })
  newTeacherId?: number;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true, comment: '调课原因' })
  reason?: string;

  @Column({ name: 'status', length: 16, default: 'PENDING', comment: '状态' })
  status: string;

  @Column({ name: 'approval_instance_id', type: 'bigint', nullable: true, comment: '关联审批实例' })
  approvalInstanceId?: number;
}
