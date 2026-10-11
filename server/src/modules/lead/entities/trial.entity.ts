import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 试听课（文档 §4.2 / §5.2）。一条线索可安排多次试听。
 */
@Entity({ name: 'trial_lesson' })
@Index(['tenantId', 'leadId'])
export class TrialLesson extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ name: 'lead_id', type: 'bigint', comment: '线索' })
  leadId: number;

  /** 关联课程课次（lesson.id），非必填（如独立安排的试听） */
  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '关联课次' })
  lessonId?: number;

  @Column({ name: 'trial_at', type: 'datetime', nullable: true, comment: '试听时间' })
  trialAt?: Date;

  @Column({ name: 'attended', type: 'tinyint', default: 0, comment: '是否到课 0/1' })
  attended: number;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '试听反馈' })
  feedback?: string;
}
