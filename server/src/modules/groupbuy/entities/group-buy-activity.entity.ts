import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

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

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'group_size', type: 'int', default: 2 })
  groupSize: number;

  @Column({ name: 'start_time', type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
