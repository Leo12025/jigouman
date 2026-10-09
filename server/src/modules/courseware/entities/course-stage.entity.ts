import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 课程阶段（文档 §4.1 课件层级：课程→阶段(含大纲文件)→课时课件） */
@Entity({ name: 'course_stage' })
@Index(['tenantId', 'courseId'])
export class CourseStage extends BaseEntity {
  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  @Column({ length: 128, comment: '阶段名称' })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  /** 阶段大纲文件（关联 resource.id） */
  @Column({ name: 'outline_resource_id', type: 'bigint', nullable: true, comment: '阶段大纲资源' })
  outlineResourceId?: number;

  @Column({ name: 'outline_url', length: 512, nullable: true, comment: '阶段大纲 URL' })
  outlineUrl?: string;

  @Column({ type: 'text', nullable: true, comment: '说明' })
  remark?: string;
}
