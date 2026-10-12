import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 组合套餐子项（文档 §2.1 #6 / §3.1）。
 * 与通用包的关键差异：组合套餐每个子项有**各自固定的课时数**（hours 有值），
 * Scratch 用完了不能拿 Python 的课时去补；通用包只圈定课程范围（hours 为空），共用一个课时池。
 */
@Entity({ name: 'package_item' })
@Index(['tenantId', 'packageId'])
@Unique(['tenantId', 'packageId', 'courseId'])
export class PackageItem extends BaseEntity {
  @Column({ name: 'package_id', type: 'bigint', comment: '课包' })
  packageId: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  /** 该子项固定课时数；为空表示仅圈定范围（通用包语义） */
  @Column({ type: 'int', nullable: true, comment: '子项课时数(空=通用包仅圈范围)' })
  hours?: number;

  @Column({ type: 'int', default: 0, comment: '排序' })
  seq: number;
}
