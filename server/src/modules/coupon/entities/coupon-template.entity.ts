import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

export type CouponType = 'DISCOUNT' | 'AMOUNT' | 'FREE_CLASS';
export type CouponTemplateStatus = 'ACTIVE' | 'DISABLED';

/** 优惠券模板（§4.17 券模块）：折扣/满减/课时券 */
@Entity({ name: 'coupon_templates' })
export class CouponTemplate extends BaseEntity {
  @Column({ name: 'name', length: 128 })
  name: string;

  /** DISCOUNT=百分比折扣(value 为百分比,如 10 表示减 10%); AMOUNT=固定减免(元); FREE_CLASS=抵扣课时 */
  @Column({ name: 'type', length: 16 })
  type: CouponType;

  @Column({ name: 'value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  /** 使用门槛(元)，0 表示无门槛 */
  @Column({ name: 'min_spend', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minSpend: number;

  /** 适用课程(null=全部课程) */
  @Column({ name: 'applicable_course_ids', type: 'simple-json', nullable: true })
  applicableCourseIds?: number[];

  /** 总发放量(null=不限) */
  @Column({ name: 'total_qty', type: 'int', nullable: true })
  totalQty?: number;

  /** 每人限领 */
  @Column({ name: 'per_limit', type: 'int', default: 1 })
  perLimit: number;

  /** 领取后有效天数 */
  @Column({ name: 'valid_days', type: 'int', default: 30 })
  validDays: number;

  @Column({ name: 'start_time', type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: CouponTemplateStatus;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
