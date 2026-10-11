import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { CreateAlertRuleDto, UpdateAlertRuleDto, CheckAlertDto, AlertPageQueryDto } from './dto/alert.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationService } from '../notification/notification.service';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class AlertService {
  private readonly repo: Repository<AlertRule>;
  constructor(
    @InjectRepository(AlertRule) repo: Repository<AlertRule>,
    private readonly dashboard: DashboardService,
    private readonly notification: NotificationService,
  ) {
    this.repo = orgRepo(repo);
  }

  async createRule(tenantId: number, d: CreateAlertRuleDto) {
    const r = this.repo.create({ tenantId, ...(d as any) } as AlertRule);
    return this.repo.save(r as any);
  }
  async listRules(tenantId: number, q: AlertPageQueryDto) {
    const where: any = { tenantId };
    if (q.metric) where.metric = q.metric;
    if (q.enabled !== undefined) where.enabled = q.enabled;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.repo.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async getRule(tenantId: number, id: number) {
    const r = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!r) throw new NotFoundException('规则不存在');
    return r;
  }
  async updateRule(tenantId: number, id: number, d: UpdateAlertRuleDto) {
    const r = await this.getRule(tenantId, id);
    Object.assign(r, d as any);
    return this.repo.save(r as any);
  }
  async removeRule(tenantId: number, id: number) {
    await this.getRule(tenantId, id);
    await this.repo.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 评估指标，返回触发的规则（供看板/定时任务调用） */
  async check(tenantId: number, metrics: Record<string, number>) {
    const rules = await this.repo.find({ where: { tenantId, enabled: true } as any });
    const triggered = rules.filter((r) => {
      const v = metrics[r.metric];
      if (v === undefined || v === null) return false;
      const thr = Number(r.threshold);
      switch (r.operator) {
        case 'GT': return v > thr;
        case 'LT': return v < thr;
        case 'GTE': return v >= thr;
        case 'LTE': return v <= thr;
        default: return false;
      }
    }).map((r) => ({ rule: r, value: metrics[r.metric] }));
    return { triggered };
  }

  /**
   * 评估全部启用规则：取看板当前指标快照 → 命中规则 → 向接收人推送站内通知(并触发外部渠道)。
   * 供定时任务/手动触发调用（§4.10 预警联动 §6.7）。
   */
  async evaluate(tenantId: number) {
    const metrics = await this.dashboard.snapshotMetrics(tenantId);
    const { triggered } = await this.check(tenantId, metrics);
    const notified: any[] = [];
    for (const { rule, value } of triggered) {
      const receivers: number[] = (rule.receivers || []).filter(
        (x: any) => x != null,
      );
      if (!receivers.length) continue;
      for (const uid of receivers) {
        const n = await this.notification.create(tenantId, {
          userId: uid,
          type: 'ALERT',
          title: `预警触发：${rule.name}`,
          content: `指标 ${rule.metric} 当前值 ${value} 触发阈值 ${rule.operator} ${rule.threshold}`,
          refType: 'alert_rule',
          refId: rule.id,
        });
        notified.push({ userId: uid, ruleId: rule.id, notificationId: (n as any).id });
      }
    }
    return {
      metrics,
      triggeredCount: triggered.length,
      triggered: triggered.map((x) => ({
        id: x.rule.id,
        name: x.rule.name,
        metric: x.rule.metric,
        value: x.value,
        channel: x.rule.channel,
      })),
      notified,
    };
  }
}
