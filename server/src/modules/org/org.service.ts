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
    // 计算祖先路径（斜杠包围，如 /5/9/），用于 ORG_AND_BELOW 子树查询
    if (d.parentId) {
      const parent = await this.repo.findOne({ where: { tenantId, id: d.parentId } as any });
      if (!parent) throw new NotFoundException('上级组织不存在');
      o.ancestors = `${parent.ancestors ?? ''}${parent.id}/`;
    } else {
      o.ancestors = '';
    }
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
    const parentChanged = d.parentId !== undefined && d.parentId !== o.parentId;
    Object.assign(o, d as any);
    if (parentChanged) {
      if (d.parentId) {
        const parent = await this.repo.findOne({ where: { tenantId, id: d.parentId } as any });
        if (!parent) throw new NotFoundException('上级组织不存在');
        o.ancestors = `${parent.ancestors ?? ''}${parent.id}/`;
      } else {
        o.ancestors = '';
      }
    }
    const saved = await this.repo.save(o as any);
    // 父级变化：重算该节点及其整棵子树的祖先路径（组织数少，整租户重算成本低）
    if (parentChanged) await this.rebuildAncestors(tenantId);
    return saved;
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
      ancestors: '',
    } as Organization);
    return this.repo.save(o as any);
  }

  /**
   * 按 parentId 重算整租户所有组织的祖先路径（幂等）。
   * 组织数量级为几十个、层级浅，整租户重算成本可忽略。
   */
  async rebuildAncestors(tenantId: number) {
    const all = await this.repo.find({ where: { tenantId } as any, order: { id: 'ASC' } as any });
    const byId = new Map<number, any>();
    all.forEach((o) => byId.set(o.id, o as any));
    for (const o of all) {
      const chain: number[] = [];
      const seen = new Set<number>();
      let cur = (o as any).parentId != null ? byId.get((o as any).parentId) : undefined;
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        chain.unshift(cur.id);
        cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
      }
      (o as any).ancestors = chain.length ? `${chain.join('/')}/` : '';
    }
    await this.repo.save(all as any);
  }

  /** 返回某组织的子树 id 集合（含自身），用于 ORG_AND_BELOW 数据范围 */
  async subtreeIds(tenantId: number, orgId: number): Promise<number[]> {
    const rows = await this.repo.query(
      `SELECT id FROM organizations WHERE tenant_id = ? AND (id = ? OR ancestors LIKE ?)`,
      [tenantId, orgId, `${orgId}/%`],
    );
    return (rows as any[]).map((r) => r.id);
  }
}
