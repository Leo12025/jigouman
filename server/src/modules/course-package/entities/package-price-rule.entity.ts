import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export type PriceDimension = 'CAMPUS' | 'TEACHER_LEVEL' | 'CLASS_TYPE' | 'AUDIENCE';

/**
 * 差异化定价（文档 §2.1 #5 / §5.2 #12）：
 * 同一套餐按校区 / 老师级别 / 班型(一对一|班课) 取不同价。
 */
@Entity({ name: 'package_price_rule' })
@Index(['tenantId', 'packageId'])
export class PackagePriceRule extends BaseEntity {
  @Column({ name: 'package_id', type: 'bigint', comment: '课包' })
  packageId: number;

  @Column({ length: 16, comment: '维度 CAMPUS 校区/TEACHER_LEVEL 老师级别/CLASS_TYPE 班型/AUDIENCE 人群(NEW/RETURNING)' })
  dimension: PriceDimension;

  @Column({ name: 'dim_value', length: 64, comment: '维度值(校区ID/老师级别/班型)' })
  dimValue: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: MONEY, comment: '该维度下的售价' })
  price: number;
}
