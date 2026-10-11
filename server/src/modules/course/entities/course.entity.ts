import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum CourseType {
  ONE_ON_ONE = 'ONE_ON_ONE',
  SMALL_CLASS = 'SMALL_CLASS',
  BIG_CLASS = 'BIG_CLASS',
  LIVE = 'LIVE',
  RECORD = 'RECORD',
  EXTERNAL = 'EXTERNAL',
}

/** 课程（文档 §4.1：产品维度"卖什么"） */
@Entity({ name: 'course' })
@Index(['tenantId', 'categoryId'])
export class Course extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，无则为租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;
  @Column({ type: 'varchar', length: 128, comment: '课程名称' })
  name: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true, comment: '课程分类' })
  categoryId?: number;

  @Column({ type: 'varchar', length: 32, comment: '课程类型(§11.3)' })
  type: CourseType;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '科目' })
  subject?: string;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '适用年龄段/年级' })
  grade?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '标价' })
  price: number;

  @Column({ name: 'total_hours', type: 'int', default: 0, comment: '课时数' })
  totalHours: number;

  @Column({ name: 'valid_days', type: 'int', nullable: true, comment: '有效期(天)' })
  validDays?: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 1上架 0下架' })
  status: number;
}
