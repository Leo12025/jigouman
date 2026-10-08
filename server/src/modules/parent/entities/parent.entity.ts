import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 家长账号（文档 §6.23 家长端登录与绑定）。
 * 以手机号 + 短信验证码(OTP)登录/注册；与学员通过 student_parent 多对多绑定。
 */
@Entity({ name: 'parent' })
@Index(['tenantId', 'phone'], { unique: true })
export class Parent extends BaseEntity {
  @Column({ type: 'varchar', length: 32, comment: '手机号(登录账号)' })
  phone: string;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '家长姓名' })
  name?: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1正常/0禁用' })
  status: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true, comment: '最近登录' })
  lastLoginAt?: Date;
}
