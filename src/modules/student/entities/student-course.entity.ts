import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum StudentCourseStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  TRANSFERRED = 'TRANSFERRED',
  REFUNDED = 'REFUNDED',
}

/** 学员报名课程（文档 §4.4 / §5.3） */
@Entity({ name: 'student_course' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'courseId'])
export class StudentCourse extends BaseEntity {
  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  @Column({ name: 'class_group_id', type: 'bigint', nullable: true, comment: '班级' })
  classGroupId?: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: 'ACTIVE',
    comment: '状态(§11.3 报名维度)',
  })
  status: StudentCourseStatus;
}
