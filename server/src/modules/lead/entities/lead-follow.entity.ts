import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 跟进方式（文档 §4.3） */
export enum FollowType {
  CALL = 'CALL',
  WECHAT = 'WECHAT',
  VISIT = 'VISIT',
  OTHER = 'OTHER',
}

/**
 * 跟进记录（文档 §4.3 / §5.2）。
 */
@Entity({ name: 'lead_follow' })
@Index(['tenantId', 'leadId'])
export class LeadFollow extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ name: 'lead_id', type: 'bigint', comment: '线索' })
  leadId: number;

  @Column({ type: 'varchar', length: 32, comment: '跟进方式(§4.3)' })
  type: FollowType;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '跟进内容' })
  content?: string;

  @Column({ name: 'next_follow_at', type: 'datetime', nullable: true, comment: '下次跟进时间' })
  nextFollowAt?: Date;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '操作人' })
  operatorId?: number;
}
