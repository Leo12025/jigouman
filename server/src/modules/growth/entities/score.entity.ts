import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 成绩（文档 §5.6）。纳入学员成长档案，家长端可查看趋势 */
@Entity({ name: 'score' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'examId'])
export class Score extends BaseEntity {
  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '课次' })
  lessonId?: number;

  @Column({ name: 'exam_id', type: 'bigint', nullable: true, comment: '测评' })
  examId?: number;

  @Column({ length: 16, default: 'EXAM', comment: '类型 EXAM/ DAILY/ CONTEST' })
  type: string;

  @Column({ type: 'float', comment: '得分' })
  score: number;

  @Column({ length: 16, nullable: true, comment: '等级 A/B/C 或 优秀/良好' })
  level?: string;

  @Column({ type: 'text', nullable: true, comment: '评语' })
  comment?: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '录入人' })
  operatorId?: number;
}
