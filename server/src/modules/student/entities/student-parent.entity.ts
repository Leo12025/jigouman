import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 家长关联桥表（文档 §4.4 / §5.3：学员↔家长 多对多）。
 * 支持手机号 OTP 验证绑定、多对多、解绑保留历史。
 */
@Entity({ name: 'student_parent' })
@Index(['tenantId', 'studentId'])
@Index(['tenantId', 'phone'])
export class StudentParent extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'parent_name', type: 'varchar', length: 64, comment: '家长姓名' })
  parentName: string;

  @Column({ type: 'varchar', length: 32, comment: '手机号(OTP验证)' })
  phone: string;

  @Column({ type: 'varchar', length: 16, nullable: true, comment: '关系 父亲/母亲/其他' })
  relation?: string;

  @Column({ name: 'is_main', type: 'tinyint', default: 0, comment: '是否主联系人' })
  isMain: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true, comment: '关联系统账号(sys_user.id)' })
  userId?: number;

  @Column({ name: 'bind_source', type: 'varchar', length: 32, nullable: true, comment: '绑定来源 otp/invite_code' })
  bindSource?: string;

  @Column({ type: 'tinyint', default: 0, comment: '是否已验证' })
  verified: number;

  @Column({ name: 'bound_at', type: 'datetime', nullable: true, comment: '绑定时间' })
  boundAt?: Date;

  @Column({ name: 'unbound_at', type: 'datetime', nullable: true, comment: '解绑时间(保留历史)' })
  unboundAt?: Date;
}
