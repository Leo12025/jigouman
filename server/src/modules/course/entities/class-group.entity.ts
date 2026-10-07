import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 班级/班课（文档 §4.1：教学维度，一对多/大班课） */
@Entity({ name: 'class_group' })
@Index(['tenantId', 'courseId'])
export class ClassGroup extends BaseEntity {
  @Column({ name: 'course_id', type: 'bigint', comment: '关联课程' })
  courseId: number;

  @Column({ type: 'varchar', length: 128, comment: '班级名称' })
  name: string;

  @Column({ name: 'teacher_id', type: 'bigint', nullable: true, comment: '授课老师(employee.id)' })
  teacherId?: number;

  @Column({ type: 'int', default: 0, comment: '容量(一对多/大班课)' })
  capacity: number;

  @Column({ name: 'start_date', type: 'date', nullable: true, comment: '开班日期' })
  startDate?: string;

  /** 上课周期/时间规则(JSON)：如 [{weekday:1,start:'09:00',end:'10:30'}] */
  @Column({ name: 'schedule_json', type: 'json', nullable: true })
  scheduleJson?: Record<string, any>;
}
