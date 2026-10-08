import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export type HourConsumeType = 'GRANT' | 'CONSUME' | 'FREEZE' | 'ROLLBACK' | 'EXPIRE';

/**
 * 课时流水（文档 §4.6）。强一致、可审计：每笔发放/消耗/回滚可追溯。
 * hours 为正表示发放、为负表示消耗/回滚；ref_order_id 关联发放来源订单。
 */
@Entity({ name: 'hour_consumption' })
@Index(['tenantId', 'accountId'])
@Index(['tenantId', 'studentId'])
export class HourConsumption extends BaseEntity {
  @Column({ name: 'account_id', type: 'bigint', comment: '课时账户' })
  accountId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '关联课次' })
  lessonId?: number;

  @Column({ name: 'type', length: 16, comment: 'GRANT 发放 / CONSUME 消课 / FREEZE 冻结 / ROLLBACK 回滚 / EXPIRE 过期' })
  type: HourConsumeType;

  @Column({ name: 'hours', type: 'int', comment: '课时(正发放/负消耗)' })
  hours: number;

  @Column({ name: 'ref_order_id', type: 'bigint', nullable: true, comment: '关联订单(发放来源)' })
  refOrderId?: number;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '操作人' })
  operatorId?: number;

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
