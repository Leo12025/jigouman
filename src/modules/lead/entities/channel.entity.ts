import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 渠道类型（文档 §4.2：地推/朋友圈/抖音/转介绍等） */
export enum ChannelType {
  GROUND_PUSH = 'GROUND_PUSH',
  WECHAT = 'WECHAT',
  DOUYIN = 'DOUYIN',
  REFERRED = 'REFERRED',
  OTHER = 'OTHER',
}

/**
 * 渠道（文档 §4.2 / §5.2）。标记成本与来源，用于转化漏斗 ROI 统计。
 */
@Entity({ name: 'channel' })
@Index(['tenantId', 'type'])
export class Channel extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '渠道名称' })
  name: string;

  @Column({ type: 'varchar', length: 32, default: ChannelType.OTHER, comment: '渠道类型(§4.2)' })
  type: ChannelType;

  @Column({ type: 'float', nullable: true, comment: '投放成本' })
  cost?: number;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '来源标识' })
  source?: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1启用 0停用' })
  status: number;
}
