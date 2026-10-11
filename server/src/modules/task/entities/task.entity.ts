import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum TaskStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

/**
 * 待办任务（文档 §4.26 待办中心最小骨架）。
 * 点名消课完成后自动生成"待写课后点评"任务；支持通用待办。
 */
@Entity({ name: 'task' })
@Index(['tenantId', 'assigneeId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'refType', 'refId'])
export class Task extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'type', length: 32, comment: '任务类型(如 AFTER_CLASS_REVIEW)' })
  type: string;

  @Column({ name: 'title', length: 200, comment: '任务标题' })
  title: string;

  @Column({ name: 'assignee_id', type: 'bigint', comment: '负责人' })
  assigneeId: number;

  @Column({ name: 'ref_type', length: 32, nullable: true, comment: '关联业务类型' })
  refType?: string;

  @Column({ name: 'ref_id', type: 'bigint', nullable: true, comment: '关联业务ID' })
  refId?: number;

  @Column({ name: 'due_at', type: 'datetime', nullable: true, comment: '截止时间' })
  dueAt?: Date;

  @Column({ name: 'status', length: 8, default: TaskStatus.TODO, comment: '状态' })
  status: TaskStatus;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt?: Date;

  @Column({ name: 'completed_by', type: 'bigint', nullable: true, comment: '完成人' })
  completedBy?: number;
}
