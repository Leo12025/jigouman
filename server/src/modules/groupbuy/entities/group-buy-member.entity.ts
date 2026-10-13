import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/**
 * 拼团成员
 * - orderId：参团即生成订单，成团后凭已支付订单发放课时（交易闭环）
 * - distributorId：来源分销员，成团后按活动佣金比例自动入账（拼团 × 分销）
 */
@Entity({ name: 'group_buy_members' })
@Index(['tenantId', 'teamId'])
export class GroupBuyMember extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Index()
  @Column({ name: 'team_id', type: 'bigint' })
  teamId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId?: number;

  @Column({ name: 'distributor_id', type: 'bigint', nullable: true })
  distributorId?: number;

  /** 是否团长（团长可能享专属价） */
  @Column({ name: 'is_leader', type: 'tinyint', default: 0 })
  isLeader: boolean;

  /** 实付单价（命中团长优惠或阶梯价后写入，便于对账） */
  @Column({ name: 'pay_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  payPrice?: number;
}
