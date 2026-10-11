import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export enum SalaryStatus {
  DRAFT = 'DRAFT', // 草稿(待确认)
  CONFIRMED = 'CONFIRMED', // 已确认
  PAID = 'PAID', // 已发放
}

/**
 * 教师工资单（文档 §4.5）。按周期 + 教师聚合分账/课次自动核算课时费与提成。
 */
@Entity({ name: 'salary' })
@Index(['tenantId', 'period'])
@Index(['tenantId', 'teacherId'])
export class Salary extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'period', length: 7, comment: '工资周期(YYYY-MM)' })
  period: string;

  @Column({ name: 'teacher_id', type: 'bigint', comment: '教师' })
  teacherId: number;

  @Column({ name: 'lessons_count', type: 'int', default: 0, comment: '课次数量' })
  lessonsCount: number;

  @Column({ name: 'hours_count', type: 'int', default: 0, comment: '消课课时' })
  hoursCount: number;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '课时费(分账提成合计)' })
  baseAmount: number;

  @Column({ name: 'bonus', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '提成' })
  bonus: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '应发合计' })
  total: number;

  @Column({ name: 'status', length: 12, default: SalaryStatus.DRAFT, comment: '状态' })
  status: SalaryStatus;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true, comment: '发放时间' })
  paidAt?: Date;
}
