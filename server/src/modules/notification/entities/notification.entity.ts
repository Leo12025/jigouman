import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum NotifyChannel {
  IN_APP = 'IN_APP', // 站内信（已接入）
  WECHAT = 'WECHAT', // 微信（通道预留，需接入网关）
  SMS = 'SMS', // 短信（通道预留，需接入网关）
}

/**
 * 站内通知（§4.26 待办中心「多渠道提醒」与 §6.6 通知触达的站内通道）。
 * 任务创建即推送负责人，作为逾期/升级提醒的触达基础；微信/短信仅预留通道字段。
 */
@Entity({ name: 'notification' })
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'readAt'])
export class Notification extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'user_id', type: 'bigint', comment: '接收人' })
  userId: number;

  @Column({ name: 'channel', length: 16, default: NotifyChannel.IN_APP, comment: '通道' })
  channel: NotifyChannel;

  @Column({ name: 'type', length: 32, comment: '通知类型(如 TASK_ASSIGNED/APPROVAL_RESULT)' })
  type: string;

  @Column({ name: 'title', length: 200 })
  title: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'ref_type', length: 32, nullable: true, comment: '关联业务类型' })
  refType?: string;

  @Column({ name: 'ref_id', type: 'bigint', nullable: true, comment: '关联业务ID' })
  refId?: number;

  @Column({ name: 'read_at', type: 'datetime', nullable: true, comment: '已读时间' })
  readAt?: Date;
}
