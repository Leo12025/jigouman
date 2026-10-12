import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export type HourAccountType = 'ONE_ON_ONE' | 'CLASS' | 'GENERAL';

/** 发放来源：付费购买 / 赠送 / 转班转入 / 退费回滚 */
export type HourGrantType = 'PAID' | 'GIFT' | 'TRANSFER' | 'ROLLBACK';

/**
 * 账户状态（文档 §4.2）：停课 vs 结课必须分开建模——
 * FROZEN 停课：保留剩余课时与学费（可复课）；CLOSED 结课：清空剩余课时，学费转机构手续费。
 */
export type HourAccountStatus = 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CLOSED';

/**
 * 课时账户（文档 §4.6 / §5.4）。
 * 学员每课程一个账户；courseId 为 null 表示通用储值/课包课时。
 * 一对一与班课账户分离（§4.6 关键规则）。
 */
@Entity({ name: 'hour_account' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'studentId', 'courseId'])
@Index(['tenantId', 'studentId', 'status'])
export class HourAccount extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程(null=通用储值/课包)' })
  courseId?: number;

  /** 关联课包(null=非课包账户；课包账户 courseId=null 且 packageId 有值，可跨套餐内课程抵扣) */
  @Column({ name: 'package_id', type: 'bigint', nullable: true, comment: '关联课包' })
  packageId?: number;

  @Column({ name: 'type', length: 16, default: 'CLASS', comment: '账户类型' })
  type: HourAccountType;

  @Column({ name: 'balance', type: 'int', default: 0, comment: '可用课时' })
  balance: number;

  @Column({ name: 'frozen', type: 'int', default: 0, comment: '冻结课时' })
  frozen: number;

  @Column({ name: 'total_granted', type: 'int', default: 0, comment: '累计发放' })
  totalGranted: number;

  /** 账户级课时单价：发放时写入，退费与分账直接取用（不再回查流水） */
  @Column({ name: 'unit_value', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '课时单价(退费/分账用)' })
  unitValue: number;

  /** 赠课标记（文档 §2.1 #7 / §5.2 #5）：赠课不退、不计入可退金额 */
  @Column({ name: 'is_granted', type: 'tinyint', default: 0, comment: '是否赠课(1=赠送,退费时不计入)' })
  isGranted: boolean;

  @Column({ name: 'grant_type', length: 16, default: 'PAID', comment: 'PAID 付费/GIFT 赠送/TRANSFER 转班/ROLLBACK 回滚' })
  grantType: HourGrantType;

  @Column({ name: 'status', length: 16, default: 'ACTIVE', comment: 'ACTIVE 正常/FROZEN 停课(保留课时)/EXPIRED 过期/CLOSED 结课(清空课时)' })
  status: HourAccountStatus;

  @Column({ name: 'start_at', type: 'datetime', nullable: true, comment: '生效时间' })
  startAt?: Date;

  @Column({ name: 'expire_at', type: 'datetime', nullable: true, comment: '有效期(按套餐 validDays 计算)' })
  expireAt?: Date;

  /** 发放来源订单项（退费时精确匹配账户，避免跨单串账） */
  @Column({ name: 'order_item_id', type: 'bigint', nullable: true, comment: '来源订单项' })
  orderItemId?: number;
}
