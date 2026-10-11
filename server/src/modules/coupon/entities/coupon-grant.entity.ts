import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

export type CouponGrantStatus = 'UNUSED' | 'USED' | 'EXPIRED';

/** 优惠券发放记录（学员持有的一张券） */
@Entity({ name: 'coupon_grants' })
export class CouponGrant extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Index()
  @Column({ name: 'template_id', type: 'bigint' })
  templateId: number;

  @Index()
  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  @Index({ unique: true })
  @Column({ name: 'code', length: 32 })
  code: string;

  @Column({ name: 'status', length: 16, default: 'UNUSED' })
  status: CouponGrantStatus;

  @Column({ name: 'granted_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  grantedAt: Date;

  @Column({ name: 'expire_at', type: 'datetime', nullable: true })
  expireAt?: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt?: Date;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId?: number;
}
