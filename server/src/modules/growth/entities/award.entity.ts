import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 获奖（文档 §5.6） */
@Entity({ name: 'award' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'contestJoinId'])
export class Award extends BaseEntity {
  @Column({ name: 'contest_join_id', type: 'bigint', nullable: true, comment: '参赛记录' })
  contestJoinId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ length: 64, comment: '奖项 如 一等奖' })
  grade: string;

  @Column({ length: 255, nullable: true, comment: '证书地址' })
  certificate?: string;

  @Column({ length: 255, nullable: true, comment: '照片' })
  photo?: string;
}
