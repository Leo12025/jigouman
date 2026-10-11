import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

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

  /** 套餐总课时（售卖的课时包总量） */
  @Column({ name: 'total_hours', type: 'int', default: 0, comment: '套餐总课时' })
  totalHours: number;

  @Column({ name: 'valid_days', type: 'int', nullable: true, comment: '有效期(天)' })
  validDays?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: MONEY, comment: '标价' })
  price: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1上架 0下架' })
  status: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;
}
