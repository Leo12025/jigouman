import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 课包-课程关联：套餐可上的课程范围（文档 §4.1 课包"能上哪些课程"） */
@Entity({ name: 'package_course' })
@Index(['tenantId', 'packageId'])
@Index(['tenantId', 'courseId'])
@Unique(['tenantId', 'packageId', 'courseId'])
export class PackageCourse extends BaseEntity {
  @Column({ name: 'package_id', type: 'bigint', comment: '课包' })
  packageId: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;
}
