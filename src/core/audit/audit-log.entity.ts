import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

/**
 * 操作审计日志（文档 §7 / §9.3）：关键写操作记录
 * who / when / what / before / after。
 */
@Entity({ name: 'audit_log' })
@Index(['tenantId', 'action'])
@Index(['tenantId', 'operatorId'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'operator_id', type: 'bigint' })
  operatorId: number;

  @Column({ name: 'operator_name', type: 'varchar', length: 64, nullable: true })
  operatorName?: string;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action: string;

  @Column({ name: 'target', type: 'varchar', length: 64, nullable: true })
  target?: string;

  @Column({ name: 'biz_id', type: 'bigint', nullable: true })
  bizId?: number;

  @Column({ name: 'method', type: 'varchar', length: 16, nullable: true })
  method?: string;

  @Column({ name: 'path', type: 'varchar', length: 255, nullable: true })
  path?: string;

  @Column({ name: 'before', type: 'json', nullable: true })
  before?: Record<string, any>;

  @Column({ name: 'after', type: 'json', nullable: true })
  after?: Record<string, any>;

  @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
  ip?: string;
}
