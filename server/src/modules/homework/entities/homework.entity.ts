import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum HomeworkStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

/**
 * 作业（文档 §4.7 / §5.5）。
 * 按课次或班级布置，支持文字/图片/音频/附件，可设截止时间。
 */
@Entity({ name: 'homework' })
@Index(['tenantId', 'lessonId'])
@Index(['tenantId', 'classGroupId'])
@Index(['tenantId', 'status'])
export class Homework extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '关联课次' })
  lessonId?: number;

  @Column({ name: 'class_group_id', type: 'bigint', nullable: true, comment: '关联班级' })
  classGroupId?: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '关联课程' })
  courseId?: number;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '布置老师' })
  teacherId?: number;

  @Column({ length: 200, comment: '标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '作业内容' })
  content?: string;

  @Column({ type: 'text', nullable: true, comment: '附件JSON(图片/音频/文件)' })
  attachments?: string;

  @Column({ type: 'datetime', nullable: true, comment: '截止时间' })
  deadline?: Date;

  @Column({ length: 16, default: HomeworkStatus.PUBLISHED, comment: '状态' })
  status: HomeworkStatus;
}
