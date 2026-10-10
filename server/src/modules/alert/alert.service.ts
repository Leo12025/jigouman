import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { CreateAlertRuleDto, UpdateAlertRuleDto, CheckAlertDto, AlertPageQueryDto } from './dto/alert.dto';

@Injectable()
export class AlertService {
  constructor(@InjectRepository(AlertRule) private readonly repo: Repository<AlertRule>) {}

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
}
