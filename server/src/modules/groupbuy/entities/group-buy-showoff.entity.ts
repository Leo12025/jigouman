import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/**
 * 拼团晒单 / 买家秀（竞品对标：核销页客户自行晒单 + 晒单集合图）。
 * 打通「购买 → 晒单 → 被分享人下单」的二次传播路径。
 */
@Entity({ name: 'group_buy_showoffs' })
@Index(['tenantId', 'activityId'])
@Index(['tenantId', 'teamId'])
export class GroupBuyShowoff extends BaseEntity {
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'activity_id', type: 'bigint' })
  activityId: number;

  @Column({ name: 'team_id', type: 'bigint' })
  teamId: number;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: number;

  /** 晒单图片 URL 列表（JSON 数组字符串） */
  @Column({ name: 'images', type: 'text', nullable: true })
  images?: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content?: string;

  /** PENDING 待审核 / APPROVED 已展示 / REJECTED 已驳回 */
  @Column({ length: 16, default: 'APPROVED' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
