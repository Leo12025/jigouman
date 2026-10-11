import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum SubmitStatus {
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
}

/**
 * 作业提交记录（文档 §4.7 / §5.5）。
 * 家长/学员端提交，支持文字、拍照、录音、文件。
 */
@Entity({ name: 'homework_submit' })
@Index(['tenantId', 'homeworkId'])
@Index(['tenantId', 'studentId'])
@Unique(['tenantId', 'homeworkId', 'studentId'])
export class HomeworkSubmit extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'homework_id', type: 'bigint', comment: '作业' })
  homeworkId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ type: 'text', nullable: true, comment: '提交内容' })
  content?: string;

  @Column({ type: 'text', nullable: true, comment: '提交文件JSON(照片/录音/文件)' })
  files?: string;

  @Column({ name: 'submit_at', type: 'datetime', nullable: true, comment: '提交时间' })
  submitAt?: Date;

  @Column({ length: 16, default: SubmitStatus.SUBMITTED, comment: '状态' })
  status: SubmitStatus;

  @Column({ name: 'is_late', type: 'tinyint', default: 0, comment: '是否逾期(超过截止时间)' })
  isLate: number;
}
