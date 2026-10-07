import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 市场活动类型（文档 §4.2） */
export enum CampaignType {
  EXPERIENCE = 'EXPERIENCE', // 体验课
  OPEN_CLASS = 'OPEN_CLASS', // 公开课
  GROUP_BUY = 'GROUP_BUY', // 拼团
  PROMO = 'PROMO', // 限时优惠
  OTHER = 'OTHER',
}

/**
 * 市场活动/投放（文档 §4.2 / §5.2）。
 */
@Entity({ name: 'campaign' })
export class Campaign extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '活动名称' })
  name: string;

  @Column({ type: 'varchar', length: 32, default: CampaignType.OTHER, comment: '活动类型(§4.2)' })
  type: CampaignType;

  @Column({ type: 'date', nullable: true, comment: '开始日期' })
  startTime?: string;

  @Column({ type: 'date', nullable: true, comment: '结束日期' })
  endTime?: string;

  @Column({ type: 'float', nullable: true, comment: '预算' })
  budget?: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1启用 0停用' })
  status: number;
}
