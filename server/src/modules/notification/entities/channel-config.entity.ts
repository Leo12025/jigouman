import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 外部消息渠道类型（管理员在「消息渠道配置」中启用并填写密钥即可使用） */
export type ChannelType = 'SMS_TENCENT' | 'SMS_ALIYUN' | 'WECHAT';

/**
 * 外部消息渠道配置（§4.26 多渠道提醒：腾讯云/阿里云短信、微信公众号）。
 * 按租户隔离；每种渠道至多一条配置。密钥等参数存于 config_json，
 * 由管理员在「系统管理→消息渠道配置」填写；未配置/未启用则不触达外部。
 */
@Entity({ name: 'channel_config' })
@Index(['tenantId', 'type'])
export class ChannelConfig extends BaseEntity {
  @Column({ name: 'type', length: 24, comment: '渠道类型 SMS_TENCENT/SMS_ALIYUN/WECHAT' })
  type: ChannelType;

  @Column({ name: 'name', length: 100, nullable: true, comment: '渠道展示名' })
  name?: string;

  @Column({ name: 'enabled', type: 'tinyint', default: 0, comment: '是否启用 1/0' })
  enabled: number;

  @Column({ name: 'config_json', type: 'json', nullable: true, comment: '渠道参数(密钥/签名/模板等，按 type 结构不同)' })
  configJson?: Record<string, any>;
}
