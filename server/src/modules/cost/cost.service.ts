import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CostRecord } from './entities/cost-record.entity';
import { CreateCostDto, UpdateCostDto, CostPageQueryDto } from './dto/cost.dto';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class CostService {
  private readonly repo: Repository<CostRecord>;
  constructor(@InjectRepository(CostRecord) repo: Repository<CostRecord>) {
    this.repo = orgRepo(repo);
  }

  async create(tenantId: number, d: CreateCostDto) {
    const r = this.repo.create({ tenantId, ...(d as any) } as CostRecord);
    return this.repo.save(r as any);
  }
  async list(tenantId: number, q: CostPageQueryDto) {
    const where: any = { tenantId };
    if (q.category) where.category = q.category;
    if (q.orgId) where.orgId = q.orgId;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.repo.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async get(tenantId: number, id: number) {
    const r = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!r) throw new NotFoundException('成本记录不存在');
    return r;
  }
  async update(tenantId: number, id: number, d: UpdateCostDto) {
    const r = await this.get(tenantId, id);
    Object.assign(r, d as any);
    return this.repo.save(r as any);
  }
  async remove(tenantId: number, id: number) {
    await this.get(tenantId, id);
    await this.repo.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 按类别汇总（§4.21 成本归集） */
  async stats(tenantId: number, orgId?: number) {
    const where: any = { tenantId };
    if (orgId) where.orgId = orgId;
    const list = await this.repo.find({ where });
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const r of list) {
      const a = Number(r.amount) || 0;
      byCategory[r.category] = Math.round(((byCategory[r.category] || 0) + a) * 100) / 100;
      total += a;
    }
    return { byCategory, total: Math.round(total * 100) / 100 };
  }
}
