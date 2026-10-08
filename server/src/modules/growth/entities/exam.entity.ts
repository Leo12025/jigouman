import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 考试测评（文档 §5.6） */
@Entity({ name: 'exam' })
@Index(['tenantId', 'courseId'])
@Index(['tenantId', 'classGroupId'])
export class Exam extends BaseEntity {
  @Column({ length: 120, comment: '测评名称' })
  name: string;

  @Column({ name: 'course_id', type: 'bigint', nullable: true, comment: '课程' })
  courseId?: number;

  @Column({ name: 'class_group_id', type: 'bigint', nullable: true, comment: '班级' })
  classGroupId?: number;

  @Column({ length: 16, default: 'REGULAR', comment: '类型 REGULAR/ MIDTERM/ FINAL' })
  type: string;

  @Column({ name: 'start_time', type: 'datetime', nullable: true, comment: '测评时间' })
  startTime?: Date;

  @Column({ name: 'full_score', type: 'float', default: 100, comment: '满分' })
  fullScore: number;

  @Column({ name: 'knowledge_points', type: 'text', nullable: true, comment: '知识点JSON' })
  knowledgePoints?: string;
}
