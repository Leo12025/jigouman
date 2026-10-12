import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MAKEUP';

/**
 * 考勤记录（文档 §4.6）。点名消课后出勤(PRESENT)触发课时扣减；
 * 请假(LEAVE)不消课；缺勤(ABSENT)不消课；补课(MAKEUP)占用可用课时。
 *
 * 唯一约束 (tenantId, lessonId, studentId)：并发/重复点名时由数据库兜底，
 * 杜绝同一课次同一学员重复消课（否则会造成重复扣课时与重复分账）。
 */
@Entity({ name: 'attendance' })
@Index(['tenantId', 'lessonId'])
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'lessonId', 'studentId'], { unique: true })
export class Attendance extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', comment: '课次' })
  lessonId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'status', length: 16, default: 'PRESENT', comment: '出勤状态' })
  status: AttendanceStatus;

  @Column({ name: 'hours', type: 'int', default: 0, comment: '本次消课数' })
  hours: number;

  /**
   * 消耗模式快照：BY_HOUR 扣课时 / BY_TIME 权益内只记出勤 / BY_PERIOD 班期内只记出勤。
   * 用于区分"扣课时"与"只记出勤"两种点名语义。
   */
  @Column({ name: 'consume_mode', length: 16, nullable: true, comment: 'BY_HOUR 扣课时/BY_TIME 权益/BY_PERIOD 班期' })
  consumeMode?: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '点名人' })
  operatorId?: number;
}
