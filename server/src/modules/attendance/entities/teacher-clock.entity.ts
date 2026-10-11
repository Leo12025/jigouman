import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 老师打卡记录（§11.6 个人排班/考勤：上下班或课次打卡） */
@Entity('teacher_clocks')
export class TeacherClock extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'tenant_id', type: 'int' })
  tenantId: number;

  @Column({ name: 'teacher_id', type: 'int' })
  teacherId: number;

  /** 打卡日期 yyyy-mm-dd */
  @Column({ name: 'date', type: 'date', nullable: true })
  date?: string;

  /** IN 上班/课次开始 / OUT 下班/课次结束 */
  @Column({ name: 'type', length: 8 })
  type: 'IN' | 'OUT';

  @Column({ name: 'lesson_id', type: 'int', nullable: true })
  lessonId?: number;

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true })
  remark?: string;
}
