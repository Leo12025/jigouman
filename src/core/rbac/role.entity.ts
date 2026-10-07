import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
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

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '数据范围: all/org/self' })
  dataScope?: 'all' | 'org' | 'self';

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
