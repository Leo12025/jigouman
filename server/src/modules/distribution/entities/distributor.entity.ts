import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 分销员/推广员（§4.28 分销裂变） */
@Entity({ name: 'distributors' })
export class Distributor extends BaseEntity {
  @Column({ name: 'name', length: 64 })
  name: string;

  @Column({ name: 'phone', length: 32, nullable: true })
  phone?: string;

  @Index()
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: number;

  @Index({ unique: true })
  @Column({ name: 'invite_code', length: 32 })
  inviteCode: string;

  @Column({ name: 'level', type: 'int', default: 1 })
  level: number;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
