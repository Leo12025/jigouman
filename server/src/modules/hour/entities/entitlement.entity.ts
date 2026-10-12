import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 时间型权益（文档 §2.2 #8/#10、§3.2）：支撑月卡/季卡/年卡、托班自习时段卡。
 * 与课时账户的关键差异：有效期内**不限次**，出勤只记 attendance，不扣课时。
 * 没有这个模型，"不限次"只能用超大课时数硬造，体验差且表达不准。
 */
@Entity({ name: 'entitlement' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'studentId', 'status'])
export class Entitlement extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'package_id', type: 'bigint', nullable: true, comment: '来源套餐' })
  packageId?: number;

  /** 权益覆盖范围：为空表示套餐内所有课程（由 package_course/package_item 圈定） */
  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '限定课程(空=套餐内全部)' })
  courseId?: number;

  @Column({ name: 'start_at', type: 'datetime', comment: '生效时间' })
  startAt: Date;

  @Column({ name: 'expire_at', type: 'datetime', comment: '到期时间' })
  expireAt: Date;

  @Column({ length: 16, default: 'ACTIVE', comment: 'ACTIVE 生效/FROZEN 停课(顺延)/EXPIRED 过期/CLOSED 作废' })
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED' | 'CLOSED';

  @Column({ name: 'ref_order_id', type: 'bigint', nullable: true, comment: '来源订单' })
  refOrderId?: number;
}
