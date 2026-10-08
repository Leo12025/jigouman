import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 课后点评（文档 §5.7 / §6.6 家校服务）。
 * 老师上课后撰写，家长端可查阅（§11.6 移动端：家长端「点评」）。
 */
@Entity({ name: 'course_review' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'lessonId'])
export class CourseReview extends BaseEntity {
  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '课次' })
  lessonId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '点评老师' })
  teacherId?: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ type: 'text', nullable: true, comment: '点评内容' })
  content?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '语音地址' })
  audio?: string;

  @Column({ type: 'text', nullable: true, comment: '照片JSON' })
  photos?: string;

  @Column({ type: 'int', nullable: true, comment: '课堂表现评分(1~5)' })
  rating?: number;

  @Column({ name: 'ai_generated', type: 'tinyint', default: 0, comment: '是否AI生成(需人工复核)' })
  aiGenerated: number;
}
