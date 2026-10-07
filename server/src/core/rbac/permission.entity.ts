import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

/** 权限点（RBAC 叶子节点，对应菜单/按钮/数据权限） */
@Entity({ name: 'permission' })
@Index(['tenantId', 'code'], { unique: true })
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '权限码,如 course:create' })
  code: string;

  @Column({ type: 'varchar', length: 64, comment: '权限名称' })
  name: string;

  @Column({ name: 'group_name', type: 'varchar', length: 64, nullable: true, comment: '权限分组' })
  group?: string;
}
