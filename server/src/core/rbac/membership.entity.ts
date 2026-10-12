import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

/**
 * 成员关系（★P2 状态机）：用户 × 租户 的归属关系，作为跨租户身份与生命周期的单一事实来源。
 * - 同一自然人可加入多个租户（UNIQUE(tenant_id, user_id)）；
 * - 状态机：INVITED(待接受) → ACTIVE(启用) → SUSPENDED(停用,保留审计) → REMOVED(移除)；
 * - 停用/移除由 JWT 校验拦截新会话（见 jwt.strategy）。
 */
@Entity({ name: 'membership' })
@Unique(['tenantId', 'userId'])
export class Membership extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 16,
    default: 'ACTIVE',
  })
  status: MembershipStatus;

  /** 邀请渠道/来源备注（可选） */
  @Column({ name: 'source', type: 'varchar', length: 64, nullable: true })
  source?: string;
}
