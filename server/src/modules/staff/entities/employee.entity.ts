import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

export type EmployeeKind =
  | 'teacher'
  | 'academic'
  | 'consultant'
  | 'finance'
  | 'operation'
  | 'admin';
export type EmployeeStatus = 'ACTIVE' | 'LEFT';

/** 员工（师资/教务/顾问/财务/运营/管理员）——全系统人员唯一主体（文档 §4.14） */
@Entity({ name: 'employees' })
export class Employee extends BaseEntity {
  @Column({ name: 'name', length: 64 })
  name: string;

  @Index()
  @Column({ name: 'phone', length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'gender', length: 8, nullable: true })
  gender?: 'M' | 'F';

  @Column({ name: 'kind', length: 16, default: 'teacher' })
  kind: EmployeeKind;

  /** 所属校区（多校区 §4.11 预留；单校区可空） */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: EmployeeStatus;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate?: Date;

  @Column({ name: 'leave_date', type: 'date', nullable: true })
  leaveDate?: Date;

  /** 绑定的登录账号(rbac users.id) */
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
