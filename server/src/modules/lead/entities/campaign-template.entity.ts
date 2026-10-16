import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 活动模板库（§4.2 营销增强：内置拼团/砍价/分销/体验卡等模板，一键发起）。
 * 模板沉淀可复用的活动配置，发起时复制为正式 Campaign，避免重复录入。
 */
@Entity({ name: 'campaign_template' })
export class CampaignTemplate extends BaseEntity {
  /** 归属校区(org_id)：无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ type: 'varchar', length: 64, comment: '模板名称' })
  name: string;

  @Column({ type: 'varchar', length: 32, default: 'OTHER', comment: '活动类型(§4.2)' })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '模板说明' })
  description?: string;

  /** 模板默认配置（预算/时长/玩法参数等），发起时合并到 Campaign */
  @Column({ type: 'text', nullable: true, comment: '模板配置 JSON' })
  configJson?: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1启用 0停用' })
  status: number;
}
