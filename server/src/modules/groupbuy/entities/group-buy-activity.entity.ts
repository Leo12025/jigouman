import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';
import { MONEY } from '../../order/entities/order.entity';

/** 参团资格：ALL 不限 / NEW_ONLY 仅新学员可参团（老客只能开团，控福利成本 + 强制拉新） */
export type JoinRule = 'ALL' | 'NEW_ONLY';

/** 拼团活动（§4.24 团购对接/自运营拼团） */
@Entity({ name: 'group_buy_activities' })
export class GroupBuyActivity extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'name', length: 128 })
  name: string;

  @Column({ name: 'course_id', type: 'bigint', nullable: true })
  courseId?: number;

  /** 关联课包：成团后按课包 consume_mode 发放 */
  @Column({ name: 'package_id', type: 'bigint', nullable: true })
  packageId?: number;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, transformer: MONEY })
  price: number;

  /** 成团后为每位成员发放的课时数 */
  @Column({ name: 'hours', type: 'int', default: 0 })
  hours: number;

  @Column({ name: 'group_size', type: 'int', default: 2 })
  groupSize: number;

  /** 团长优惠价：团长开团享专属价，提高开团意愿（提升裂变的关键设计） */
  @Column({ name: 'leader_price', type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: MONEY })
  leaderPrice?: number;

  /** 团有效期(小时)：团长开团后须在此时间内邀满，过期团失效 */
  @Column({ name: 'team_valid_hours', type: 'int', default: 24 })
  teamValidHours: number;

  /** 模拟成团：活动结束仍未满员时系统自动补足成团（商家控成本 + 保成团率） */
  @Column({ name: 'auto_fill', type: 'tinyint', default: 0 })
  autoFill: boolean;

  /** 新老客限制：NEW_ONLY 时老学员不可参团（仅可开团） */
  @Column({ name: 'join_rule', length: 16, default: 'ALL' })
  joinRule: JoinRule;

  /** 拼团分销：一级佣金比例(0~1)，成团后自动给推荐人入账 */
  @Column({ name: 'commission_rate1', type: 'decimal', precision: 5, scale: 4, default: 0 })
  commissionRate1: number;

  /** 拼团分销：二级佣金比例(0~1) */
  @Column({ name: 'commission_rate2', type: 'decimal', precision: 5, scale: 4, default: 0 })
  commissionRate2: number;

  @Column({ name: 'start_time', type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime?: Date;

  /** 活动负责人：未成团退款的兜底审批人 */
  @Column({ name: 'owner_id', type: 'bigint', nullable: true })
  ownerId?: number;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
