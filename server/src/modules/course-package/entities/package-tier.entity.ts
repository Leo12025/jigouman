import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/**
 * 阶梯规格（文档 §2.1 #3）：同一套餐 30/60 课时两档，单价递减。
 * 档间建议价差 15%~25%，规格 2~3 种为宜。
 */
@Entity({ name: 'package_tier' })
@Index(['tenantId', 'packageId'])
export class PackageTier extends BaseEntity {
  @Column({ name: 'package_id', type: 'bigint', comment: '课包' })
  packageId: number;

  @Column({ type: 'int', comment: '该档位课时数' })
  hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: MONEY, comment: '该档位售价' })
  price: number;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;
}
