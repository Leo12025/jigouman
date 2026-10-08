import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MAKEUP';

/**
 * 考勤记录（文档 §4.6）。点名消课后出勤(PRESENT)触发课时扣减；
 * 请假(LEAVE)不消课；缺勤(ABSENT)不消课；补课(MAKEUP)占用可用课时。
 */
@Entity({ name: 'attendance' })
@Index(['tenantId', 'lessonId'])
@Index(['tenantId', 'studentId'])
export class Attendance extends BaseEntity {
  @Column({ name: 'lesson_id', type: 'bigint', comment: '课次' })
  lessonId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'status', length: 16, default: 'PRESENT', comment: '出勤状态' })
  status: AttendanceStatus;

  @Column({ name: 'hours', type: 'int', default: 0, comment: '本次消课数' })
  hours: number;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '点名人' })
  operatorId?: number;
}
