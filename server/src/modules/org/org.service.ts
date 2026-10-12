import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Not, Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrgDto, UpdateOrgDto, OrgPageQueryDto } from './dto/org.dto';
import { TenantService } from '../tenant/tenant.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class OrgService {
  private readonly repo: Repository<Organization>;
  constructor(
    @InjectRepository(Organization) repo: Repository<Organization>,
    @Inject(forwardRef(() => TenantService)) private readonly tenantService: TenantService,
  ) {
    this.repo = orgRepo(repo);
  }

  async create(tenantId: number, d: CreateOrgDto) {
    // 每租户仅允许一个 HQ（总校区）：已有则拒绝新建
    if (d.type === 'HQ') {
      const existHq = await this.repo.findOne({ where: { tenantId, type: 'HQ' } as any });
      if (existHq) throw new NotFoundException('该租户已存在总校区(HQ)，请勿重复创建');
    } else {
      // 校区额度校验（HQ 不计额度）：超过品牌域 maxCampuses 则拒绝
      const tenant = await this.tenantService.get(tenantId);
      if (tenant.maxCampuses != null) {
        const used = await this.repo.count({ where: { tenantId, type: Not('HQ') } as any });
        if (used >= tenant.maxCampuses) {
          throw new BusinessException(ResCode.BAD_REQUEST, `校区额度已满（上限 ${tenant.maxCampuses}）`);
        }
      }
    }
    const o = this.repo.create({ tenantId, ...(d as any) } as Organization);
    return this.repo.save(o as any);
  }

  async list(tenantId: number, q: OrgPageQueryDto) {
    const where: any = { tenantId };
    if (q.type) where.type = q.type;
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    const list = await this.repo.find({ where, order: { sort: 'ASC', id: 'ASC' } as any });
    return list;
  }

  /** 构建组织树（按 parentId 嵌套 children） */
  async tree(tenantId: number) {
    const list = await this.repo.find({ where: { tenantId } as any, order: { sort: 'ASC', id: 'ASC' } as any });
    const map = new Map<number, any>();
    list.forEach((o) => map.set(o.id, { ...o, children: [] }));
    const roots: any[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) map.get(node.parentId).children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  async get(tenantId: number, id: number) {
    const o = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!o) throw new NotFoundException('组织不存在');
    return o;
  }

  async update(tenantId: number, id: number, d: UpdateOrgDto) {
    const o = await this.get(tenantId, id);
    Object.assign(o, d as any);
    return this.repo.save(o as any);
  }

  async remove(tenantId: number, id: number) {
    const children = await this.repo.count({ where: { tenantId, parentId: id } as any });
    if (children > 0) {
      throw new NotFoundException('请先删除下级组织');
    }
    await this.get(tenantId, id);
    await this.repo.softDelete({ tenantId, id } as any);
    return { id };
  }

  /**
   * 确保租户存在「总校区(HQ)」根节点：租户即总校区，建租户时自动建根，幂等。
   * 平台建租户或钻取管理校区时调用，避免每租户手动建 HQ。
   */
  async ensureHq(tenantId: number, name: string) {
    const exist = await this.repo.findOne({ where: { tenantId, type: 'HQ' } as any });
    if (exist) return exist;
    const o = this.repo.create({
      tenantId,
      name,
      type: 'HQ',
      status: 'ACTIVE',
      sort: 0,
    } as Organization);
    return this.repo.save(o as any);
  }
}
