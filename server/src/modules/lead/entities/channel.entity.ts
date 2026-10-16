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

/** 外部直连来源类型（渠道直连入库，§4.2 营销增强） */
export enum ChannelExternalType {
  NONE = 'NONE', // 非直连（手工录入）
  DOUYIN = 'DOUYIN', // 抖音广告
  MEITUAN = 'MEITUAN', // 美团/大众点评
  WECHAT_ADS = 'WECHAT_ADS', // 微信广告
}

/**
 * 渠道（文档 §4.2 / §5.2）。标记成本与来源，用于转化漏斗 ROI 统计。
 */
@Entity({ name: 'channel' })
@Index(['tenantId', 'type'])
export class Channel extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
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

  /** 是否开启外部线索直连入库（§4.2 营销增强） */
  @Column({ name: 'ingest_enabled', type: 'tinyint', default: 0, comment: '外部线索直连开关' })
  ingestEnabled?: number;

  /** 外部直连来源类型（抖音/美团/微信广告） */
  @Column({
    name: 'external_type',
    type: 'varchar',
    length: 16,
    default: ChannelExternalType.NONE,
    comment: '外部直连来源类型',
  })
  externalType?: ChannelExternalType;

  /** 直连配置（凭证/参数 JSON，如 accessToken；生产应加密存储） */
  @Column({ type: 'text', nullable: true, comment: '直连配置 JSON（凭证等）' })
  configJson?: string;
}
