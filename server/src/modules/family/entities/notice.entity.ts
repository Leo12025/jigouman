import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 家校通知（文档 §5.7）：消课通知、上课提醒、活动通知等，家长端接收 */
@Entity({ name: 'notice' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'type'])
export class Notice extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ length: 32, comment: '类型 CONSUME/ LESSON/ ACTIVITY/ SYSTEM' })
  type: string;

  @Column({ name: 'student_id', type: 'bigint', nullable: true, comment: '学员(为空表示全员)' })
  studentId?: number;

  @Column({ length: 200, comment: '标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '内容' })
  content?: string;

  @Column({ length: 16, default: 'APP', comment: '通道 APP/ SMS/ OA' })
  channel: string;

  @Column({ name: 'send_at', type: 'datetime', nullable: true, comment: '发送时间' })
  sendAt?: Date;

  @Column({ length: 16, default: 'SENT', comment: '状态 DRAFT/ SENT/ READ' })
  status: string;

  @Column({ name: 'read_at', type: 'datetime', nullable: true, comment: '家长阅读时间' })
  readAt?: Date;
}
