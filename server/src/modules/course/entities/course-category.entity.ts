import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 课程分类（文档 §4.1，支持多级） */
@Entity({ name: 'course_category' })
@Index(['tenantId', 'parentId'])
export class CourseCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '分类名称' })
  name: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true, comment: '父级(多级)' })
  parentId?: number;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;
}
