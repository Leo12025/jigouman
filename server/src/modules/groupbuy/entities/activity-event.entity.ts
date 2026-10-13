import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 活动过程埋点（竞品对标：数据中心监控 访问/分享/报名/核销 等过程数据）。
 * 未授权访客也可留痕（visitorId），更准确反映活动真实触达。
 */
export type ActivityEventType =
  | 'VIEW' | 'SHARE' | 'JOIN' | 'TEAM_OPEN' | 'TEAM_SUCCESS' | 'REDEEM';

@Entity({ name: 'activity_events' })
@Index(['tenantId', 'activityId'])
@Index(['tenantId', 'activityId', 'type'])
export class ActivityEvent extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'activity_id', type: 'bigint' })
  activityId: number;

  @Column({ name: 'team_id', type: 'bigint', nullable: true })
  teamId?: number;

  @Column({ length: 16 })
  type: ActivityEventType;

  /** 已登录学员；未登录为 null */
  @Column({ name: 'student_id', type: 'bigint', nullable: true })
  studentId?: number;

  /** 匿名访客标识：未授权用户也留痕，精准反映真实触达 */
  @Column({ name: 'visitor_id', type: 'varchar', length: 64, nullable: true })
  visitorId?: string;

  /** 归属员工(顾问)：用于员工榜与战队 PK 统计 */
  @Column({ name: 'staff_id', type: 'bigint', nullable: true })
  staffId?: number;
}
