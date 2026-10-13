import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/** PENDING 待审批 / APPROVED 已批准待补款 / REJECTED 已驳回 / DONE 已执行 / CANCELLED 已撤销 */
export type UpgradeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE' | 'CANCELLED';

/**
 * 套餐升级单（文档 §2.4 #18）：30 课时包升 60 课时包，补差价。
 *
 * 核心口径（已确认）：
 * - 原套餐剩余**付费**课时按原账户单价折成金额，抵扣新套餐价款；
 * - 折价兑现后原账户**清零并置 CLOSED**（不重复计权益）；
 * - 赠课是否参与折价**可配置**（includeGift，默认不参与，与退费口径一致）；
 * - 走审批流（bizType=PACKAGE_UPGRADE）；补款付清后才执行升级。
 */
@Entity({ name: 'package_upgrade' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'status'])
export class PackageUpgrade extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  /** 被升级的原课时账户（折价后清零） */
  @Column({ name: 'from_account_id', type: 'bigint', comment: '原课时账户' })
  fromAccountId: number;

  @Column({ name: 'from_package_id', type: 'bigint', nullable: true, comment: '原套餐' })
  fromPackageId?: number;

  @Column({ name: 'to_package_id', type: 'bigint', comment: '目标套餐' })
  toPackageId: number;

  @Column({ name: 'to_tier_id', type: 'bigint', nullable: true, comment: '目标阶梯档位' })
  toTierId?: number;

  /** 参与折价的付费课时 */
  @Column({ name: 'carry_hours', type: 'int', default: 0, comment: '折价付费课时' })
  carryHours: number;

  /** 参与折价的赠课课时（includeGift=true 时有值） */
  @Column({ name: 'gift_hours', type: 'int', default: 0, comment: '折价赠课课时' })
  giftHours: number;

  /** 赠课是否参与折价（默认否，与退费口径一致） */
  @Column({ name: 'include_gift', type: 'tinyint', default: 0, comment: '赠课是否参与折价' })
  includeGift: boolean;

  @Column({ name: 'unit_value', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '原账户课时单价' })
  unitValue: number;

  /** 折价金额 = (付费课时 + 参与折价的赠课课时) × 原单价 */
  @Column({ name: 'deduct_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '折价抵扣金额' })
  deductAmount: number;

  @Column({ name: 'target_hours', type: 'int', default: 0, comment: '目标套餐课时' })
  targetHours: number;

  @Column({ name: 'target_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '目标套餐价' })
  targetAmount: number;

  /** 应付差价 = 目标套餐价 − 折价金额 */
  @Column({ name: 'payable_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '应付差价' })
  payableAmount: number;

  /** 差价订单（order_type=UPGRADE） */
  @Column({ name: 'order_id', type: 'bigint', nullable: true, comment: '差价订单' })
  orderId?: number;

  @Column({ name: 'approval_instance_id', type: 'bigint', nullable: true, comment: '审批实例' })
  approvalInstanceId?: number;

  @Column({ length: 16, default: 'PENDING', comment: 'PENDING/APPROVED/REJECTED/DONE/CANCELLED' })
  status: UpgradeStatus;

  @Column({ name: 'executed_at', type: 'datetime', nullable: true, comment: '执行时间' })
  executedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
