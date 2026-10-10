import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { Distributor } from './entities/distributor.entity';
import { Commission } from './entities/commission.entity';
import { CreateDistributorDto, UpdateDistributorDto, RecordCommissionDto, DistributorPageQueryDto } from './dto/distribution.dto';

function randCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

@Injectable()
export class DistributionService {
  constructor(
    @InjectRepository(Distributor) private readonly dist: Repository<Distributor>,
    @InjectRepository(Commission) private readonly comm: Repository<Commission>,
  ) {}

  async createDistributor(tenantId: number, d: CreateDistributorDto) {
    if (d.parentId) {
      const p = await this.dist.findOne({ where: { tenantId, id: d.parentId } as any });
      if (!p) throw new BusinessException(ResCode.BAD_REQUEST, '邀请人不存在');
    }
    const e = this.dist.create({ tenantId, inviteCode: randCode('DS'), ...(d as any) } as Distributor);
    return this.dist.save(e as any);
  }

  async listDistributors(tenantId: number, q: DistributorPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.parentId) where.parentId = q.parentId;
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.dist.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  /** 分销层级树（按 parentId 嵌套 children） */
  async tree(tenantId: number) {
    const all = await this.dist.find({ where: { tenantId } as any, order: { id: 'ASC' } as any });
    const map = new Map<number, any>();
    all.forEach((d) => map.set(d.id, { ...d, children: [] as any[] }));
    const roots: any[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) map.get(node.parentId).children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  async getDistributor(tenantId: number, id: number) {
    const e = await this.dist.findOne({ where: { tenantId, id } as any });
    if (!e) throw new BusinessException(ResCode.BAD_REQUEST, '分销员不存在');
    return e;
  }

  async updateDistributor(tenantId: number, id: number, d: UpdateDistributorDto) {
    const e = await this.getDistributor(tenantId, id);
    Object.assign(e, d as any);
    return this.dist.save(e as any);
  }

  async removeDistributor(tenantId: number, id: number) {
    await this.getDistributor(tenantId, id);
    await this.dist.softDelete({ tenantId, id } as any);
    return { id };
  }

  async recordCommission(tenantId: number, d: RecordCommissionDto) {
    await this.getDistributor(tenantId, d.distributorId);
    const c = this.comm.create({ tenantId, status: 'PENDING', ...(d as any) } as Commission);
    return this.comm.save(c as any);
  }

  async listCommissions(tenantId: number, distributorId: number) {
    return this.comm.find({ where: { tenantId, distributorId } as any, order: { id: 'DESC' } as any });
  }

  async settleCommission(tenantId: number, id: number, status: 'PENDING' | 'SETTLED' | 'CANCELLED') {
    const c = await this.comm.findOne({ where: { tenantId, id } as any });
    if (!c) throw new BusinessException(ResCode.BAD_REQUEST, '佣金记录不存在');
    c.status = status;
    if (status === 'SETTLED') c.settledAt = new Date();
    return this.comm.save(c as any);
  }

  /** 佣金汇总：各状态总额 */
  async stats(tenantId: number) {
    const list = await this.comm.find({ where: { tenantId } as any });
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const c of list) {
      const amt = Number(c.amount) || 0;
      byStatus[c.status] = (byStatus[c.status] || 0) + amt;
      total += amt;
    }
    return { total, byStatus };
  }
}
