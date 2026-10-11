import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 拼团成员 */
@Entity({ name: 'group_buy_members' })
export class GroupBuyMember extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Index()
  @Column({ name: 'team_id', type: 'bigint' })
  teamId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;
}
