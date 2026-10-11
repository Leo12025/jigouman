import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 分销佣金记录（§4.28） */
@Entity({ name: 'commissions' })
export class Commission extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Index()
  @Column({ name: 'distributor_id', type: 'bigint' })
  distributorId: number;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId?: number;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'status', length: 16, default: 'PENDING' })
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';

  @Column({ name: 'settled_at', type: 'datetime', nullable: true })
  settledAt?: Date;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
