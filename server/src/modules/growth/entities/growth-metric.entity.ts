import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 素养评价（文档 §4.8 / §5.6）：自定义维度周期性打分，如专注力、表达力 */
@Entity({ name: 'growth_metric' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'period'])
export class GrowthMetric extends BaseEntity {
  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ length: 64, comment: '维度(专注力/表达力等)' })
  dimension: string;

  @Column({ type: 'float', comment: '评分' })
  score: number;

  @Column({ length: 16, comment: '周期 如 2026-10' })
  period: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true, comment: '评价人' })
  operatorId?: number;
}
