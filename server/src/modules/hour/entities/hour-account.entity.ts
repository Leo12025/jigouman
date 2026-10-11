import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export type HourAccountType = 'ONE_ON_ONE' | 'CLASS' | 'GENERAL';

/**
 * 课时账户（文档 §4.6 / §5.4）。
 * 学员每课程一个账户；courseId 为 null 表示通用储值课时。
 * 一对一与班课账户分离（§4.6 关键规则）。
 */
@Entity({ name: 'hour_account' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'studentId', 'courseId'])
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

  @Column({ name: 'expire_at', type: 'datetime', nullable: true, comment: '有效期' })
  expireAt?: Date;
}
