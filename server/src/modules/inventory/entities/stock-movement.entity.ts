import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 库存流水（§4.20） */
@Entity({ name: 'stock_movements' })
export class StockMovement extends BaseEntity {
  @Column({ name: 'material_id', type: 'bigint' })
  materialId: number;

  @Column({ name: 'type', length: 8 })
  type: 'IN' | 'OUT';

  @Column({ name: 'qty', type: 'int' })
  qty: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;

  @Column({ name: 'operator_id', type: 'bigint', nullable: true })
  operatorId?: number;
}
