import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum ComplaintChannel {
  PHONE = 'PHONE',
  WECHAT = 'WECHAT',
  WALKIN = 'WALKIN',
  OTHER = 'OTHER',
}

export enum ComplaintLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ComplaintStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/** 客诉/售后（文档 §6.23 家长端客诉/售后；§4.26 客诉分派→COMPLAINT 待办） */
@Entity({ name: 'complaint' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'assigneeId'])
export class Complaint extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', nullable: true, comment: '关联学员' })
  studentId?: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '关联课程' })
  courseId?: number;

  @Column({ length: 160, comment: '客诉标题' })
  title: string;

  @Column({ type: 'text', comment: '客诉内容' })
  content: string;

  @Column({ length: 16, default: 'OTHER', comment: '来源 PHONE/WECHAT/WALKIN/OTHER' })
  channel: string;

  @Column({ length: 16, default: 'MEDIUM', comment: '等级 LOW/MEDIUM/HIGH' })
  level: string;

  @Column({ length: 16, default: 'PENDING', comment: '状态 PENDING/PROCESSING/RESOLVED/CLOSED' })
  status: string;

  @Column({ name: 'assignee_id', type: 'bigint', nullable: true, comment: '处理人(分派给谁)' })
  assigneeId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '登记人' })
  createdBy?: number;

  @Column({ type: 'text', nullable: true, comment: '处理结论' })
  resolution?: string;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true, comment: '处理时间' })
  resolvedAt?: Date;
}
