import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 资质证书：教师资格证 / 学历 / 考级或赛事指导资质（含到期提醒） */
@Entity({ name: 'certificates' })
export class Certificate extends BaseEntity {
  @Index()
  @Column({ name: 'employee_id', type: 'bigint' })
  employeeId: number;

  /** 资质类型：TEACHER_CERT / EDUCATION / SKILL 等 */
  @Column({ name: 'type', length: 32 })
  type: string;

  @Column({ name: 'name', length: 128 })
  name: string;

  @Column({ name: 'issuer', length: 128, nullable: true })
  issuer?: string;

  @Column({ name: 'issued_at', type: 'date', nullable: true })
  issuedAt?: Date;

  @Column({ name: 'expire_at', type: 'date', nullable: true })
  expireAt?: Date;

  /** 证书文件资源(resource.id) */
  @Column({ name: 'file_res_id', type: 'bigint', nullable: true })
  fileResId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
