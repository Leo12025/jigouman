import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

export type CostCategory = 'RENT' | 'SALARY' | 'MATERIAL' | 'MARKETING' | 'OTHER';

/** 机构成本记录（§4.21） */
@Entity({ name: 'cost_records' })
export class CostRecord extends BaseEntity {
  @Column({ name: 'category', length: 32 })
  category: CostCategory;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'occurred_at', type: 'date', nullable: true })
  occurredAt?: Date;

  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;

  @Column({ name: 'attach_res_id', type: 'bigint', nullable: true })
  attachResId?: number;
}
