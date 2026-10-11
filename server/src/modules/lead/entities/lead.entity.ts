import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 线索阶段机（文档 §8.3 / §11.3）：
 * 新线索 → 跟进中 → 已试听 → 已报名 → （无效）
 */
export enum LeadStage {
  NEW = 'NEW',
  FOLLOWING = 'FOLLOWING',
  TRIALED = 'TRIALED',
  SIGNED = 'SIGNED',
  INVALID = 'INVALID',
}

/**
 * 线索/潜客（文档 §4.3 / §5.2）。
 * 报名后通过 convert 关联 student，打通 CRM 与学员档案。
 */
@Entity({ name: 'lead' })
@Index(['tenantId', 'stage'])
@Index(['tenantId', 'ownerId'])
@Index(['tenantId', 'channelId'])
export class Lead extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ type: 'varchar', length: 64, comment: '姓名' })
  name: string;

  @Column({ type: 'varchar', length: 32, comment: '手机号' })
  phone: string;

  @Column({ name: 'channel_id', type: 'bigint', nullable: true, comment: '来源渠道' })
  channelId?: number;

  @Column({ name: 'campaign_id', type: 'bigint', nullable: true, comment: '来源活动' })
  campaignId?: number;

  @Column({ type: 'varchar', length: 32, default: LeadStage.NEW, comment: '阶段(§11.3)' })
  stage: LeadStage;

  /** 跟进顾问/归属人（指向 employee，M8 引入员工模块，此处仅存 ID） */
  @Column({ name: 'owner_id', type: 'bigint', nullable: true, comment: '归属顾问' })
  ownerId?: number;

  @Column({ name: 'last_follow_at', type: 'datetime', nullable: true, comment: '最近跟进时间' })
  lastFollowAt?: Date;

  @Column({ type: 'tinyint', nullable: true, comment: '性别 1男 2女' })
  gender?: number;

  @Column({ type: 'int', nullable: true, comment: '年龄' })
  age?: number;

  @Column({ name: 'intention_course', type: 'varchar', length: 64, nullable: true, comment: '意向课程' })
  intentionCourse?: string;

  @Column({ type: 'float', nullable: true, comment: '预算' })
  budget?: number;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '来源标签' })
  source?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;

  /** 转化后学员 ID（线索→学员打通，§4.3 关键规则） */
  @Column({ name: 'converted_student_id', type: 'bigint', nullable: true, comment: '转化后学员ID' })
  convertedStudentId?: number;
}
