import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Role } from './role.entity';

/** 系统用户（RBAC 主体；员工/家长/顾问账号统一映射到此表） */
@Entity({ name: 'sys_user' })
@Index(['tenantId', 'username'], { unique: true })
@Index(['tenantId', 'phone'], { unique: true, where: 'deleted_at IS NULL' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '登录账号' })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 128, comment: 'bcrypt 哈希' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '姓名' })
  name?: string;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ type: 'varchar', length: 128, nullable: true, comment: '邮箱' })
  email?: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1启用 0禁用' })
  status: number;

  /** 归属校区 id 列表（空=租户内所有校区可见）；用于多校区账号的校区切换与隔离 */
  @Column({ name: 'org_ids', type: 'simple-json', nullable: true, comment: '归属校区id列表，空=全部' })
  orgIds?: number[] | null;

  /** 微信 openid（管理员微信登录/绑定） */
  @Column({ name: 'wechat_openid', type: 'varchar', length: 64, nullable: true, comment: '微信openid' })
  wechatOpenid?: string | null;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'user_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
