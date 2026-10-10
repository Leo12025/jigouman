import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 督学/出勤记录（§4.13 在线课堂打卡督学） */
@Entity({ name: 'study_records' })
export class StudyRecord extends BaseEntity {
  @Index()
  @Column({ name: 'class_id', type: 'bigint' })
  classId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  @Column({ name: 'joined_at', type: 'datetime', nullable: true })
  joinedAt?: Date;

  @Column({ name: 'duration_sec', type: 'int', default: 0 })
  durationSec: number;

  @Column({ name: 'status', length: 16, default: 'PRESENT' })
  status: 'PRESENT' | 'LATE' | 'ABSENT';

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;
}
