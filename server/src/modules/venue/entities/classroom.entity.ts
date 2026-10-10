import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 教室与场地（文档 §4.15）：排课/考勤的场地主体，复用于排课冲突检测 */
@Entity({ name: 'classrooms' })
export class Classroom extends BaseEntity {
  @Column({ name: 'name', length: 64 })
  name: string;

  /** 所属校区（多校区 §4.11 预留） */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'capacity', type: 'int', default: 0 })
  capacity: number;

  /** 场地类型：教室/舞蹈室/机房/操场 等 */
  @Column({ name: 'type', length: 32, nullable: true })
  type?: string;

  /** 设备清单，JSON 数组 */
  @Column({ name: 'equipment', type: 'simple-json', nullable: true })
  equipment?: string[];

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
