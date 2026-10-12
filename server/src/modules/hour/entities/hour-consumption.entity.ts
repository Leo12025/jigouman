import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export type HourConsumeType = 'GRANT' | 'CONSUME' | 'FREEZE' | 'ROLLBACK' | 'EXPIRE';

/**
 * 家长确认状态（文档 §4.3 / §5.2 #9）：一课一消要求消课记录可被外部核对，
 * 完成一节课并经家长确认后，监管银行才向机构划拨该课时款项。
 */
export type ConfirmStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

/**
 * 课时流水（文档 §4.6）。强一致、可审计：每笔发放/消耗/回滚可追溯。
 * hours 为正表示发放、为负表示消耗/回滚；ref_order_id 关联发放来源订单。
 */
@Entity({ name: 'hour_consumption' })
@Index(['tenantId', 'accountId'])
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'lessonId'])
export class HourConsumption extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'account_id', type: 'bigint', comment: '课时账户' })
  accountId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程(课包抵扣时记实际上课课程)' })
  courseId?: number;

  /** 关联课包(课包账户抵扣时记录来源套餐) */
  @Column({ name: 'package_id', type: 'bigint', nullable: true, comment: '关联课包' })
  packageId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '关联课次' })
  lessonId?: number;

  @Column({ name: 'type', length: 16, comment: 'GRANT 发放 / CONSUME 消课 / FREEZE 冻结 / ROLLBACK 回滚 / EXPIRE 过期' })
  type: HourConsumeType;

  @Column({ name: 'hours', type: 'int', comment: '课时(正发放/负消耗)' })
  hours: number;

  @Column({ name: 'ref_order_id', type: 'bigint', nullable: true, comment: '关联订单(发放来源)' })
  refOrderId?: number;

  @Column({ name: 'unit_value', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '发放时课时单价(用于分账价值计算)' })
  unitValue: number;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '操作人' })
  operatorId?: number;

  /** 一课一消：家长确认状态（仅 CONSUME 流水有语义） */
  @Column({ name: 'confirm_status', length: 16, nullable: true, comment: '家长确认 PENDING 待确认/CONFIRMED 已确认/REJECTED 有异议' })
  confirmStatus?: ConfirmStatus;

  @Column({ name: 'confirm_at', type: 'datetime', nullable: true, comment: '家长确认时间' })
  confirmAt?: Date;

  /** 关联考勤记录（消课与点名一一对应，便于对账） */
  @Column({ name: 'attendance_id', type: 'bigint', nullable: true, comment: '关联考勤' })
  attendanceId?: number;

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
