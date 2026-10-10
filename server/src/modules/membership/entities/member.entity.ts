import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 会员（按学员唯一） */
@Entity({ name: 'members' })
export class Member extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  @Column({ name: 'level_id', type: 'bigint', nullable: true })
  levelId?: number;

  @Column({ name: 'points', type: 'int', default: 0 })
  points: number;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;

  @Column({ name: 'expire_at', type: 'datetime', nullable: true })
  expireAt?: Date;

  @Column({ name: 'status', length: 16, default: 'NORMAL' })
  status: 'NORMAL' | 'LOCKED';
}
