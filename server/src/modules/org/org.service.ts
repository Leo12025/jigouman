import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrgDto, UpdateOrgDto, OrgPageQueryDto } from './dto/org.dto';

@Injectable()
export class OrgService {
  constructor(@InjectRepository(Organization) private readonly repo: Repository<Organization>) {}

  async create(tenantId: number, d: CreateOrgDto) {
    // 每租户仅允许一个 HQ（总校区）：已有则拒绝新建
    if (d.type === 'HQ') {
      const existHq = await this.repo.findOne({ where: { tenantId, type: 'HQ' } as any });
      if (existHq) throw new NotFoundException('该租户已存在总校区(HQ)，请勿重复创建');
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
}
