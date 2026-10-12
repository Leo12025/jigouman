import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

/** 加入方式：全程班 / 插班（中期加入，按剩余课次折减学费） */
export type JoinType = 'FULL' | 'LATE';

/**
 * 期课报名/班期绑定（文档 §2.3 #11/#12、§3.2）：支撑期课、集训营、寒暑假班。
 * 按期消耗不做逐次课时账户，按课次出勤；中途报名记 LATE 并落折减，便于退费举证。
 */
@Entity({ name: 'enrollment' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'classGroupId'])
export class Enrollment extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'class_group_id', type: 'bigint', nullable: true, comment: '班期' })
  classGroupId?: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'package_id', type: 'bigint', nullable: true, comment: '来源套餐' })
  packageId?: number;

  @Column({ name: 'joined_at', type: 'datetime', comment: '报名/加入时间' })
  joinedAt: Date;

  @Column({ name: 'join_type', length: 16, default: 'FULL', comment: 'FULL 全程/LATE 插班' })
  joinType: JoinType;

  /** 插班折减：剩余课次与折减金额（文档 §2.3 #12） */
  @Column({ name: 'discount_hours', type: 'int', default: 0, comment: '插班折减课时' })
  discountHours: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0, transformer: MONEY, comment: '插班折减金额' })
  discountAmount: number;

  @Column({ name: 'total_lessons', type: 'int', default: 0, comment: '班期总课次' })
  totalLessons: number;

  @Column({ name: 'attended_lessons', type: 'int', default: 0, comment: '已出勤课次' })
  attendedLessons: number;

  @Column({ length: 16, default: 'ACTIVE', comment: 'ACTIVE 在读/FINISHED 结课/TRANSFERRED 转班/REFUNDED 退费' })
  status: 'ACTIVE' | 'FINISHED' | 'TRANSFERRED' | 'REFUNDED';

  @Column({ name: 'ref_order_id', type: 'bigint', nullable: true, comment: '来源订单' })
  refOrderId?: number;
}
