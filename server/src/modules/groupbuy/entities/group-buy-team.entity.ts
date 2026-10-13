import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** OPEN 进行中 / SUCCESS 已成团 / INVALID 已失效(过期未满) / REDEEMED 已核销 */
export type TeamStatus = 'OPEN' | 'SUCCESS' | 'INVALID' | 'REDEEMED';

/** 拼团实例（成团） */
@Entity({ name: 'group_buy_teams' })
@Index(['tenantId', 'activityId', 'status'])
export class GroupBuyTeam extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'activity_id', type: 'bigint' })
  activityId: number;

  @Index({ unique: true })
  @Column({ name: 'code', length: 32 })
  code: string;

  @Column({ name: 'leader_student_id', type: 'bigint' })
  leaderStudentId: number;

  @Column({ name: 'current_size', type: 'int', default: 1 })
  currentSize: number;

  @Column({ length: 16, default: 'OPEN' })
  status: TeamStatus;

  @Column({ name: 'success_at', type: 'datetime', nullable: true })
  successAt?: Date;

  /** 团有效期：开团时间 + 活动 teamValidHours，过期未成团则失效 */
  @Column({ name: 'expire_at', type: 'datetime', nullable: true })
  expireAt?: Date;

  /** 核销落库：防止同一团重复核销，并留存核销人与时间 */
  @Column({ name: 'redeemed_at', type: 'datetime', nullable: true })
  redeemedAt?: Date;

  @Column({ name: 'redeemed_by', type: 'bigint', nullable: true })
  redeemedBy?: number;

  /** 模拟成团标记：到期由系统自动补足而非真实满员 */
  @Column({ name: 'auto_filled', type: 'tinyint', default: 0 })
  autoFilled: boolean;
}
