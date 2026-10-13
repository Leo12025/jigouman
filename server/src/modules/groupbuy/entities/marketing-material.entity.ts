import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 营销物料（竞品对标：微传单 / 微图文）。
 * 轻量实现：模板化的活动内容页（HTML/图片），可复用、可打印、可转发；
 * 不做可视化拖拽编辑器，先解决"有物料可用"的问题。
 */
@Entity({ name: 'marketing_materials' })
@Index(['tenantId', 'status'])
export class MarketingMaterial extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ length: 128 })
  name: string;

  /** POSTER 海报 / FLYER 传单 / ARTICLE 图文 / INVITE 邀请函 */
  @Column({ length: 16, default: 'POSTER' })
  type: 'POSTER' | 'FLYER' | 'ARTICLE' | 'INVITE';

  /** 适用节点：如 开学季/暑期/双十一，便于按节日检索 */
  @Column({ name: 'scene', type: 'varchar', length: 64, nullable: true })
  scene?: string;

  /** 关联活动（可空=通用模板） */
  @Column({ name: 'activity_id', type: 'bigint', nullable: true })
  activityId?: number;

  /** 正文 HTML（图文模板） */
  @Column({ name: 'content', type: 'text', nullable: true })
  content?: string;

  /** 封面/成品图 URL（海报、传单） */
  @Column({ name: 'cover_url', type: 'varchar', length: 512, nullable: true })
  coverUrl?: string;

  /** 是否支持直接打印（线下地推） */
  @Column({ name: 'printable', type: 'tinyint', default: 0 })
  printable: boolean;

  @Column({ length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'ARCHIVED';
}
