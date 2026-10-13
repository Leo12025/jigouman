import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/**
 * 拼团阶梯（竞品对标：多阶梯拼团，人数越多价越低）。
 * 官方建议 3~5 档：太多让客户望而却步，太少没有获得感。
 * minSize = 达到该人数时的成团价；成团后按实际人数命中最高档位计价。
 */
@Entity({ name: 'group_buy_tiers' })
@Index(['tenantId', 'activityId'])
export class GroupBuyTier extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'activity_id', type: 'bigint' })
  activityId: number;

  /** 达到该参团人数 */
  @Column({ name: 'min_size', type: 'int' })
  minSize: number;

  /** 该档位对应单价 */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: MONEY })
  price: number;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
