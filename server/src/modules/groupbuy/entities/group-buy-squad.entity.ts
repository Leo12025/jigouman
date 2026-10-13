import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 战队（竞品对标：战队管理 + 数据大屏明星员工榜）。
 * 员工分组 PK：员工加入时可选已有战队，按战队/员工维度统计拼团业绩并排名。
 */
@Entity({ name: 'group_buy_squads' })
@Index(['tenantId', 'activityId'])
export class GroupBuySquad extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'activity_id', type: 'bigint', nullable: true, comment: '空=机构级战队' })
  activityId?: number;

  @Column({ length: 64 })
  name: string;

  /** 战队成员(员工)ID 列表，JSON 数组字符串 */
  @Column({ name: 'staff_ids', type: 'text', nullable: true })
  staffIds?: string;

  @Column({ length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';
}
