import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from './order.entity';

/** 订单项（文档 §5.4）。hours 为该订单项对应的发放课时数 */
@Entity({ name: 'order_item' })
@Index(['tenantId', 'orderId'])
export class OrderItem extends BaseEntity {
  @Column({ name: 'order_id', type: 'bigint', comment: '订单' })
  orderId: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  @Column({ name: 'item_type', length: 16, default: 'COURSE', comment: 'COURSE 课程 / HOUR_PACK 课时包' })
  itemType: 'COURSE' | 'HOUR_PACK';

  /** HOUR_PACK 时关联课包（支付发放到学员课包账户） */
  @Column({ name: 'package_id', type: 'bigint', nullable: true, comment: '关联课包' })
  packageId?: number;

  @Column({ name: 'name', length: 128, comment: '名称快照' })
  name: string;

  @Column({ name: 'qty', type: 'int', comment: '数量' })
  qty: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '单价' })
  unitPrice: number;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '小计' })
  amount: number;

  /** 该订单项发放的课时数（订单支付成功后落到学员课时账户） */
  @Column({ name: 'hours', type: 'int', default: 0, comment: '发放课时' })
  hours: number;
}
