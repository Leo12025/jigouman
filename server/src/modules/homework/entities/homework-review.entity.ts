import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 作业批改记录（文档 §4.7 / §5.5）。
 * 老师在线批改：打分、写评语、标注错误（优秀标记用于优秀率统计）。
 */
@Entity({ name: 'homework_review' })
@Index(['tenantId', 'homeworkId'])
@Index(['tenantId', 'studentId'])
@Unique(['tenantId', 'submitId'])
export class HomeworkReview extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'submit_id', type: 'bigint', comment: '提交记录' })
  submitId: number;

  @Column({ name: 'homework_id', type: 'bigint', comment: '作业' })
  homeworkId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '批改老师' })
  teacherId?: number;

  @Column({ type: 'float', nullable: true, comment: '得分' })
  score?: number;

  @Column({ type: 'text', nullable: true, comment: '评语' })
  comment?: string;

  @Column({ type: 'text', nullable: true, comment: '批注/错误标注JSON' })
  attachments?: string;

  @Column({ name: 'is_excellent', type: 'tinyint', default: 0, comment: '是否优秀作业' })
  isExcellent: number;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true, comment: '批改时间' })
  reviewedAt?: Date;
}
