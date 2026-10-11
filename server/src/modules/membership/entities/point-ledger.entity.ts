import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 积分流水（§4.19） */
@Entity({ name: 'point_ledgers' })
export class PointLedger extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'member_id', type: 'bigint' })
  memberId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  @Column({ name: 'type', length: 16 })
  type: 'EARN' | 'REDEEM' | 'EXPIRE';

  /** 带符号：EARN 正 / REDEEM 负 */
  @Column({ name: 'points', type: 'int' })
  points: number;

  @Column({ name: 'ref_type', length: 32, nullable: true })
  refType?: string;

  @Column({ name: 'ref_id', type: 'bigint', nullable: true })
  refId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
