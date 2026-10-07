import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum LessonStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

/**
 * 课次（文档 §4.1 / §5.1）。room_id 关联 classroom.id（§4.15，M8 引入）。
 * 冲突检测（§8.5）在排课服务中基于 teacher/room/class 时间重叠拦截。
 */
@Entity({ name: 'lesson' })
@Index(['tenantId', 'classGroupId'])
@Index(['tenantId', 'startTime'])
export class Lesson extends BaseEntity {
  @Column({ name: 'class_group_id', type: 'bigint', comment: '班级' })
  classGroupId: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '授课老师' })
  teacherId?: number;

  @Column({ name: 'start_time', type: 'datetime', comment: '开始时间' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', comment: '结束时间' })
  endTime: Date;

  /** 关联教室(classroom.id)，M8 引入教室模块 */
  @Column({ name: 'room_id', type: 'bigint', nullable: true, comment: '教室' })
  roomId?: number;

  @Column({ type: 'varchar', length: 32, default: 'SCHEDULED', comment: '课次状态(§11.3)' })
  status: LessonStatus;
}
