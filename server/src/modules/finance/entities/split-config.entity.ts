import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 分账配置（文档 §4.5）。每个租户一条：教师课时提成率、渠道/合作方分成率。
 * 在线分账建议对接持牌机构，此处用本地记录 + 状态模拟。
 */
@Entity({ name: 'split_config' })
@Index(['tenantId'])
export class SplitConfig extends BaseEntity {
  @Column({ name: 'teacher_rate', type: 'decimal', precision: 5, scale: 4, default: 0.3, comment: '教师课时提成率' })
  teacherRate: number;

  @Column({ name: 'channel_rate', type: 'decimal', precision: 5, scale: 4, default: 0.1, comment: '渠道/合作方分成率' })
  channelRate: number;

  @Column({ name: 'bonus_rate', type: 'decimal', precision: 5, scale: 4, default: 0.1, comment: '工资提成系数(在课时费基础上)' })
  bonusRate: number;
}
