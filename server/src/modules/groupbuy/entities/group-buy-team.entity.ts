import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 拼团实例（成团） */
@Entity({ name: 'group_buy_teams' })
export class GroupBuyTeam extends BaseEntity {
  @Column({ name: 'activity_id', type: 'bigint' })
  activityId: number;

  @Index({ unique: true })
  @Column({ name: 'code', length: 32 })
  code: string;

  @Column({ name: 'leader_student_id', type: 'bigint' })
  leaderStudentId: number;

  @Column({ name: 'current_size', type: 'int', default: 1 })
  currentSize: number;

  @Column({ name: 'status', length: 16, default: 'OPEN' })
  status: 'OPEN' | 'SUCCESS' | 'INVALID';

  @Column({ name: 'success_at', type: 'datetime', nullable: true })
  successAt?: Date;
}
