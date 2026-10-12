import {
  Entity,
  Column,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Permission } from './permission.entity';

/** 角色（RBAC 中间层，聚合权限点） */
@Entity({ name: 'role' })
@Index(['tenantId', 'code'], { unique: true })
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '角色编码,如 admin' })
  code: string;

  @Column({ type: 'varchar', length: 64, comment: '角色名称' })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '数据范围: all/org/org_and_below/self' })
  dataScope?: 'all' | 'org' | 'org_and_below' | 'self';

  /** 继承的平台角色模板(tenant_id=0)；授权 = 模板权限 ∪ 自身权限（模板+覆盖模型） */
  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'inherits_from' })
  inheritsFrom?: Role | null;

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
