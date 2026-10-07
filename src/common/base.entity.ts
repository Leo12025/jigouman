import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * 全系统实体基类（文档 §5 约定）：所有表均含
 * id, tenant_id, created_at, updated_at, deleted_at
 * 采用单库多租户（tenant_id 隔离），软删除。
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** 租户隔离键（单库多租户），由 TenantGuard 注入 */
  @Column({ name: 'tenant_id', type: 'bigint', default: 0 })
  tenantId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
