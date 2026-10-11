import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 赛事（文档 §5.6） */
@Entity({ name: 'contest' })
@Index(['tenantId', 'status'])
export class Contest extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ length: 120, comment: '赛事名称' })
  name: string;

  @Column({ length: 32, nullable: true, comment: '级别 校级/市级/省级/国家级' })
  level?: string;

  @Column({ length: 120, nullable: true, comment: '主办方' })
  organizer?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true, comment: '开始日期' })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true, comment: '结束日期' })
  endDate?: Date;

  @Column({ name: 'entry_fee', type: 'float', default: 0, comment: '报名费' })
  entryFee: number;

  @Column({ length: 16, default: 'OPEN', comment: '状态 OPEN/ ONGOING/ CLOSED' })
  status: string;
}
