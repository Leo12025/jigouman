import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 库存流水（§4.20） */
@Entity({ name: 'stock_movements' })
export class StockMovement extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

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
