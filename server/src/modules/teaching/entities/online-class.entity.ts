import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 在线课堂（§4.13 直播/录播课） */
@Entity({ name: 'online_classes' })
export class OnlineClass extends BaseEntity {
  @Column({ name: 'title', length: 128 })
  title: string;

  @Column({ name: 'teacher_id', type: 'bigint' })
  teacherId: number;

  @Column({ name: 'course_id', type: 'bigint', nullable: true })
  courseId?: number;

  @Column({ name: 'start_time', type: 'datetime', nullable: true })
  startTime?: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime?: Date;

  @Column({ name: 'url', type: 'varchar', length: 512, nullable: true })
  url?: string;

  @Column({ name: 'status', length: 16, default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
