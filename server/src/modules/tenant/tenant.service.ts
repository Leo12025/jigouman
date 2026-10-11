import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './dto/tenant.dto';

/** 租户服务：CRUD + 域名解析（租户中心 & 多租户网关） */
@Injectable()
export class TenantService {
  /** 域名 -> 租户 解析缓存（60s），避免每请求查库 */
  private cache = new Map<string, { id: number; ts: number }>();

  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  /**
   * 按 Host 头解析租户：先精确匹配 domain，再取子域名(slug)匹配。
   * 例：acme.example.com -> domain='acme.example.com' 命中；acme.localhost -> slug='acme' 命中。
   */
  async findByHost(rawHost?: string): Promise<Tenant | null> {
    if (!rawHost) return null;
    const host = rawHost.toLowerCase().split(':')[0];
    const cached = this.cache.get(host);
    if (cached && Date.now() - cached.ts < 60_000) {
      const t = cached.id ? await this.repo.findOne({ where: { id: cached.id } }) : null;
      if (t) return t;
    }
    let t = host ? await this.repo.findOne({ where: { domain: host } }) : null;
    if (!t) {
      const sub = host.split('.')[0];
      if (sub && sub !== host) t = await this.repo.findOne({ where: { slug: sub } });
    }
    this.cache.set(host, { id: t?.id ?? 0, ts: Date.now() });
    return t;
  }

  private invalidate() {
    this.cache.clear();
  }

  async list(q: TenantQueryDto) {
    const where: any = {};
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    if (q.status) where.status = q.status;
    return this.repo.find({ where, order: { id: 'ASC' } as any });
  }

  async get(id: number) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('租户不存在');
    return t;
  }

  async create(d: CreateTenantDto) {
    const exist = await this.repo.findOne({
      where: [{ slug: d.slug }, ...(d.domain ? [{ domain: d.domain }] : [])],
    });
    if (exist) throw new ConflictException('slug 或 domain 已存在');
    const t = this.repo.create({
      slug: d.slug,
      domain: d.domain || null,
      name: d.name,
      config: d.config,
      status: 'ACTIVE',
    });
    const saved = await this.repo.save(t);
    this.invalidate();
    return saved;
  }

  async update(id: number, d: UpdateTenantDto) {
    const t = await this.get(id);
    if (d.domain !== undefined) t.domain = d.domain || null;
    if (d.name !== undefined) t.name = d.name;
    if (d.status !== undefined) t.status = d.status;
    if (d.config !== undefined) t.config = d.config;
    const saved = await this.repo.save(t);
    this.invalidate();
    return saved;
  }

  async remove(id: number) {
    const t = await this.get(id);
    await this.repo.softDelete({ id: t.id });
    this.invalidate();
    return { id: t.id };
  }

  /** 确保默认租户存在（幂等，显式指定 id 与业务数据 tenant_id 对齐，避免自增冲突） */
  async ensureDefaultTenant(id: number, slug: string, name: string, domain: string) {
    const exist = await this.repo.findOne({ where: { id } });
    if (exist) {
      if (!exist.domain && domain) {
        exist.domain = domain;
        await this.repo.save(exist);
      }
      return exist;
    }
    const t = this.repo.create({ id, slug, name, domain, status: 'ACTIVE' });
    return this.repo.save(t);
  }
}
