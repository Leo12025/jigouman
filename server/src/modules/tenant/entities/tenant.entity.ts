import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type TenantStatus = 'ACTIVE' | 'DISABLED';

/**
 * 租户（§2.2 多租户）：一个租户 = 一个连锁品牌（默认机构/平台租户即 DEFAULT_TENANT_ID）。
 * 与业务实体解耦——业务数据通过 tenant_id 关联，本表只存租户元数据与域名映射。
 * 注意：本实体不继承 BaseEntity（避免自身带 tenant_id 的鸡生蛋问题）。
 */
@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** 租户短码（子域名用，如 acme.example.com 的 acme），全局唯一 */
  @Index({ unique: true })
  @Column({ name: 'slug', length: 64 })
  slug: string;

  /** 绑定的访问域名（可空；如 acme.example.com / acme.localhost），解析租户时优先精确匹配 */
  @Column({ name: 'domain', type: 'varchar', length: 255, nullable: true })
  domain?: string | null;

  @Column({ name: 'name', length: 128 })
  name: string;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: TenantStatus;

  /** 租户级配置（主题/语言/功能开关），JSON 文本 */
  @Column({ name: 'config', type: 'text', nullable: true })
  config?: string;

  /** 有效期截止（空=永久可用），总域据此管控品牌域授权期限 */
  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date | null;

  /** 校区额度（最大校区/分校数，空=不限），总域据此管控品牌域规模 */
  @Column({ name: 'max_campuses', type: 'int', nullable: true })
  maxCampuses?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
