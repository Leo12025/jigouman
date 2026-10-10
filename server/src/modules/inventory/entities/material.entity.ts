import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 教材/物料（§4.20 库存） */
@Entity({ name: 'materials' })
export class Material extends BaseEntity {
  @Column({ name: 'sku', length: 64, nullable: true })
  sku?: string;

  @Column({ name: 'name', length: 128 })
  name: string;

  @Column({ name: 'category', length: 64, nullable: true })
  category?: string;

  @Column({ name: 'unit', length: 16, nullable: true })
  unit?: string;

  @Column({ name: 'stock_qty', type: 'int', default: 0 })
  stockQty: number;

  @Column({ name: 'warning_qty', type: 'int', default: 0 })
  warningQty: number;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
