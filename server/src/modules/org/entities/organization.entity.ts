import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

export type OrgType = 'HQ' | 'BRANCH' | 'CAMPUS';

/** 组织机构（§4.11 多校区连锁）：树形结构，作为按 org_id 隔离的基础 */
@Entity({ name: 'organizations' })
export class Organization extends BaseEntity {
  @Column({ name: 'name', length: 128 })
  name: string;

  @Index()
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: number;

  /** HQ 总部 / BRANCH 分校 / CAMPUS 校区 */
  @Column({ name: 'type', length: 32, default: 'BRANCH' })
  type: OrgType;

  @Column({ name: 'region', length: 64, nullable: true })
  region?: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string;

  /** 负责人(关联 staff 员工) */
  @Column({ name: 'manager_id', type: 'bigint', nullable: true })
  managerId?: number;

  @Column({ name: 'sort', type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';
}
