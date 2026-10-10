import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 会员等级（§4.19 积分会员） */
@Entity({ name: 'member_levels' })
export class MemberLevel extends BaseEntity {
  @Column({ name: 'name', length: 64 })
  name: string;

  @Column({ name: 'level', type: 'int', default: 1 })
  level: number;

  /** 达到该等级所需累计积分 */
  @Column({ name: 'min_points', type: 'int', default: 0 })
  minPoints: number;

  /** 会员折扣(%) */
  @Column({ name: 'discount', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'perks', type: 'text', nullable: true })
  perks?: string;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';
}
