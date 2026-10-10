import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 拼团成员 */
@Entity({ name: 'group_buy_members' })
export class GroupBuyMember extends BaseEntity {
  @Index()
  @Column({ name: 'team_id', type: 'bigint' })
  teamId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;
}
