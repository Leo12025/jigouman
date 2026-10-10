import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

export type AlertOperator = 'GT' | 'LT' | 'GTE' | 'LTE';

/** 预警规则（§4.10 看板预警）：指标阈值 → 触发渠道与接收人 */
@Entity({ name: 'alert_rules' })
export class AlertRule extends BaseEntity {
  @Column({ name: 'name', length: 128 })
  name: string;

  /** 指标: ARREARS_AMOUNT 欠费额 / ATTENDANCE_RATE 出勤率 / TRIAL_CONVERSION 试听转化 / EXPENSE_RATIO 成本率 / LEAD_RESPONSE 线索响应(分) */
  @Column({ name: 'metric', length: 32 })
  metric: string;

  @Column({ name: 'operator', length: 8 })
  operator: AlertOperator;

  @Column({ name: 'threshold', type: 'decimal', precision: 12, scale: 4 })
  threshold: number;

  /** 触发渠道: SMS / WECHAT / INAPP */
  @Column({ name: 'channel', length: 32, default: 'INAPP' })
  channel: string;

  /** 接收人 userIds */
  @Column({ name: 'receivers', type: 'simple-json', nullable: true })
  receivers?: number[];

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
