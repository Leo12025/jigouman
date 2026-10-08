import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export enum SplitType {
  TEACHER_COMMISSION = 'TEACHER_COMMISSION', // 教师课时提成
  CHANNEL_SPLIT = 'CHANNEL_SPLIT', // 渠道/合作方分成
}

export enum SplitStatus {
  PENDING = 'PENDING', // 待结算
  SETTLED = 'SETTLED', // 已结算
}

/**
 * 分账记录（文档 §4.5）。基于"消课事件"触发，财务与教务一致、可溯源。
 * base_amount 为本次消课对应的课时价值，amount = base_amount × rate。
 */
@Entity({ name: 'split_record' })
@Index(['tenantId', 'period'])
@Index(['tenantId', 'teacherId'])
export class SplitRecord extends BaseEntity {
  @Column({ name: 'order_id', type: 'bigint', nullable: true, comment: '来源订单' })
  orderId?: number;

  @Column({ name: 'lesson_id', type: 'bigint', nullable: true, comment: '关联课次' })
  lessonId?: number;

  @Column({ name: 'ref_consumption_id', type: 'bigint', nullable: true, comment: '关联消课流水' })
  refConsumptionId?: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '授课老师' })
  teacherId?: number;

  @Column({ name: 'channel_partner_id', type: 'bigint', nullable: true, comment: '渠道/合作方' })
  channelPartnerId?: number;

  @Column({ name: 'type', length: 24, comment: '分账类型' })
  type: SplitType;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '消课价值(基数)' })
  baseAmount: number;

  @Column({ name: 'rate', type: 'decimal', precision: 5, scale: 4, default: 0, comment: '分成率' })
  rate: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '分账金额' })
  amount: number;

  @Column({ name: 'period', length: 7, comment: '结算周期(YYYY-MM)' })
  period: string;

  @Column({ name: 'status', length: 12, default: SplitStatus.PENDING, comment: '结算状态' })
  status: SplitStatus;

  @Column({ name: 'settled_at', type: 'datetime', nullable: true, comment: '结算时间' })
  settledAt?: Date;
}
