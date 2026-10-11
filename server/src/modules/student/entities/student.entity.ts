import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum StudentStatus {
  STUDYING = 'STUDYING',
  SUSPENDED = 'SUSPENDED',
  GRADUATED = 'GRADUATED',
  REFUNDED = 'REFUNDED',
}

/** 学员（文档 §4.4，全生命周期主键 student_id） */
@Entity({ name: 'student' })
@Index(['tenantId', 'status'])
export class Student extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ type: 'varchar', length: 64, comment: '姓名' })
  name: string;

  @Column({ type: 'tinyint', default: 1, comment: '性别 1男 2女' })
  gender: number;

  @Column({ type: 'date', nullable: true, comment: '生日' })
  birthday?: string;

  @Column({ type: 'varchar', length: 128, nullable: true, comment: '学校' })
  school?: string;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '年级' })
  grade?: string;

  @Column({ type: 'varchar', length: 32, default: 'STUDYING', comment: '状态(§11.3)' })
  status: StudentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '标签 JSON 数组' })
  tags?: string;
}
