import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/** 售卖形态（商品展示层）：单次课/课时包/组合套餐/期课/时间卡/定金 */
export type PackageSellType =
  | 'SINGLE' | 'HOUR_PACK' | 'COMBO' | 'PERIOD_COURSE' | 'TIME_CARD' | 'DEPOSIT';

/**
 * 消耗模式（文档 §1/§3）——决定账户模型，是系统建模的关键维度：
 * - BY_HOUR   按课时：发课时到 hour_account，点名扣课时
 * - BY_TIME   按时间：发时间型权益 entitlement，有效期内只记出勤不扣课时（年卡/不限次）
 * - BY_PERIOD 按期：绑定班期 enrollment，按课次出勤，不逐次建课时账户
 */
export type PackageConsumeMode = 'BY_HOUR' | 'BY_TIME' | 'BY_PERIOD';

/** 适用范围：通用包(全部课程) / 限定包(指定课程) */
export type PackageScopeType = 'ALL_COURSE' | 'SPECIFIED_COURSE';

/** 课包/售卖套餐（文档 §4.1：产品维度"卖什么"——含多少课时、可上哪些课程） */
@Entity({ name: 'course_package' })
@Index(['tenantId', 'status'])
export class CoursePackage extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ length: 128, comment: '套餐名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '套餐说明' })
  description?: string;

  /** 套餐编码（对外展示/对接用） */
  @Column({ length: 64, nullable: true, comment: '套餐编码' })
  code?: string;

  /** 售卖形态（默认 HOUR_PACK） */
  @Column({ name: 'sell_type', length: 16, default: 'HOUR_PACK', comment: 'SINGLE 单次课/HOUR_PACK 课时包/COMBO 组合套餐/PERIOD_COURSE 期课/TIME_CARD 时间卡/DEPOSIT 定金' })
  sellType: PackageSellType;

  /** 消耗模式：决定发放到课时账户 / 时间权益 / 班期报名 */
  @Column({ name: 'consume_mode', length: 16, default: 'BY_HOUR', comment: 'BY_HOUR 按课时/BY_TIME 按时间/BY_PERIOD 按期' })
  consumeMode: PackageConsumeMode;

  /** 适用范围：通用包(跨课程共用课时池) vs 限定包 */
  @Column({ name: 'scope_type', length: 16, default: 'SPECIFIED_COURSE', comment: 'ALL_COURSE 通用包/SPECIFIED_COURSE 限定包' })
  scopeType: PackageScopeType;

  /** 套餐总课时（BY_HOUR 时有值） */
  @Column({ name: 'total_hours', type: 'int', default: 0, comment: '套餐总课时' })
  totalHours: number;

  @Column({ name: 'valid_days', type: 'int', nullable: true, comment: '有效期(天)' })
  validDays?: number;

  /** BY_PERIOD 期课绑定的班期（报名时写入 enrollment） */
  @Column({ name: 'class_group_id', type: 'bigint', nullable: true, comment: '期课绑定班期' })
  classGroupId?: number;

  @Column({ name: 'list_price', type: 'decimal', precision: 10, scale: 2, default: 0, transformer: MONEY, comment: '标价(划线价)' })
  listPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: MONEY, comment: '售价' })
  price: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1上架 0下架' })
  status: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;
}
