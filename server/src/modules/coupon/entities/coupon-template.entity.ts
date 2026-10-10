import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

export type CouponType =
  | 'DISCOUNT' // 百分比折扣(VALUE 为百分比，如 10 表示减 10%)
  | 'AMOUNT' // 固定减免(元)
  | 'FULL_REDUCTION' // 满减/阶梯满减(tiers)
  | 'FREE_CLASS' // 抵扣课时
  | 'GIFT' // 买赠(giftRule)
  | 'FLASH'; // 限时特价(VALUE 为特价单价，仅限 applicableCourseIds)

export type CouponTemplateStatus = 'ACTIVE' | 'DISABLED';

/** 优惠券/促销模板（§4.17 券模块 → 完整促销引擎） */
@Entity({ name: 'coupon_templates' })
export class CouponTemplate extends BaseEntity {
  @Column({ name: 'name', length: 128 })
  name: string;

  @Column({ name: 'type', length: 16 })
  type: CouponType;

  /** DISCOUNT=百分比; AMOUNT=减免元; FLASH=特价单价; 其余按规则解释 */
  @Column({ name: 'value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  /** 使用门槛(元)，0 表示无门槛 */
  @Column({ name: 'min_spend', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minSpend: number;

  /** 适用课程(null=不限) */
  @Column({ name: 'applicable_course_ids', type: 'simple-json', nullable: true })
  applicableCourseIds?: number[];

  /** 适用班级(null=不限) */
  @Column({ name: 'applicable_class_group_ids', type: 'simple-json', nullable: true })
  applicableClassGroupIds?: number[];

  /** 适用人群标签(null=不限，如 ['NEW','VIP']) */
  @Column({ name: 'applicable_student_tags', type: 'simple-json', nullable: true })
  applicableStudentTags?: string[];

  /** 满减阶梯([{threshold, minus}]，按最高命中档位减免) */
  @Column({ name: 'tiers', type: 'simple-json', nullable: true })
  tiers?: { threshold: number; minus: number }[];

  /** 买赠规则({buyQty, giftQty, giftCourseId, giftName}) */
  @Column({ name: 'gift_rule', type: 'simple-json', nullable: true })
  giftRule?: { buyQty: number; giftQty: number; giftCourseId: number; giftName?: string };

  /** 是否可叠加(0=不可与任何优惠叠加，仅自身生效) */
  @Column({ name: 'stackable', type: 'tinyint', default: 1 })
  stackable: number;

  /** 互斥组(同组仅生效最优一个) */
  @Column({ name: 'stack_group', length: 32, nullable: true })
  stackGroup?: string;

  /** 单笔最多叠加数量(仅对可叠加券/活动生效) */
  @Column({ name: 'max_stack', type: 'int', default: 3 })
  maxStack: number;

  /** 叠加优先级(高者优先保留) */
  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  /** 是否全场自动叠加活动(1=下单自动套用，无需券码) */
  @Column({ name: 'auto_apply', type: 'tinyint', default: 0 })
  autoApply: number;

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
