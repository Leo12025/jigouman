import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 课时课件（文档 §4.1 课件层级末端）：每课时的 PPT/视频/文档等。
 * resources 为资源包(JSON)，可挂多个文件；resourceId/url 为主资源。
 */
@Entity({ name: 'courseware' })
@Index(['tenantId', 'stageId'])
@Index(['tenantId', 'courseId'])
export class Courseware extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'course_id', type: 'bigint', comment: '课程' })
  courseId: number;

  @Column({ name: 'stage_id', type: 'bigint', comment: '所属阶段' })
  stageId: number;

  @Column({ length: 128, comment: '课件标题' })
  title: string;

  /** PPT / VIDEO / DOC / AUDIO */
  @Column({ length: 32, default: 'PPT', comment: '类型' })
  type: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  /** 主资源（关联 resource.id） */
  @Column({ name: 'resource_id', type: 'bigint', nullable: true, comment: '主资源' })
  resourceId?: number;

  @Column({ name: 'url', length: 512, nullable: true, comment: '主资源 URL' })
  url?: string;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true, comment: '时长(分钟)' })
  durationMinutes?: number;

  /** 资源包(JSON 数组): 多文件 [{resourceId,url,name,size}] */
  @Column({ type: 'text', nullable: true, comment: '资源包(JSON)' })
  resources?: string;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark?: string;
}
