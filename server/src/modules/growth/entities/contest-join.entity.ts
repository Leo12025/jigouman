import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 赛事参与（文档 §5.6） */
@Entity({ name: 'contest_join' })
@Index(['tenantId', 'contestId'])
@Index(['tenantId', 'studentId'])
export class ContestJoin extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'contest_id', type: 'bigint', comment: '赛事' })
  contestId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ length: 64, nullable: true, comment: '团队/组别' })
  team?: string;

  @Column({ name: 'coach_id', type: 'bigint', nullable: true, comment: '指导老师' })
  coachId?: number;

  @Column({ length: 16, default: 'JOINED', comment: '状态 JOINED/ DONE' })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '参赛结果' })
  result?: string;
}
