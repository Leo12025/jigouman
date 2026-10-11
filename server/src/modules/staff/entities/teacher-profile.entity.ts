import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity, Index } from 'typeorm';

/** 师资档案（仅老师类员工具备）：任教学科 / 擅长年龄段 / 简介 / 头像 */
@Entity({ name: 'teacher_profiles' })
export class TeacherProfile extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Index({ unique: true })
  @Column({ name: 'employee_id', type: 'bigint' })
  employeeId: number;

  /** 任教学科，JSON 数组 */
  @Column({ name: 'subjects', type: 'simple-json', nullable: true })
  subjects?: string[];

  /** 擅长年龄段，JSON 数组 */
  @Column({ name: 'age_groups', type: 'simple-json', nullable: true })
  ageGroups?: string[];

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;

  /** 头像资源(resource.id) */
  @Column({ name: 'avatar_res_id', type: 'bigint', nullable: true })
  avatarResId?: number;
}
