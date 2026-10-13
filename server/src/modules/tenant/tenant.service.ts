import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto, UpdateTenantSelfDto } from './dto/tenant.dto';

/** 租户服务：CRUD + 域名解析（租户中心 & 多租户网关） */
import { orgRepo } from '../../common/org-scope';
import { LruCache } from '../../common/lru-cache';

@Injectable()
export class TenantService {
  /**
   * 域名 -> 租户 解析缓存（60s TTL + LRU 上限）。
   * 注意：key 来自客户端 Host 头且该查询**每请求都会执行**，
   * 因此①不缓存解析失败(null)的结果，②必须限条数——
   * 否则伪造随机 Host 即可让该 Map 无限增长（可远程触发的内存泄漏）。
   */
  private cache = new LruCache<Tenant | null>({ max: 2000, ttlMs: 60_000 });
  /** 用户名@品牌域 解析缓存（60s TTL + LRU 上限） */
  private slugCache = new LruCache<Tenant | null>({ max: 2000, ttlMs: 60_000 });

  private readonly repo: Repository<Tenant>;
  constructor(@InjectRepository(Tenant) repo: Repository<Tenant>) {
    this.repo = orgRepo(repo);
  }

  /**
   * 按 Host 头解析租户：先精确匹配 domain，再取子域名(slug)匹配。
   * 例：acme.example.com -> domain='acme.example.com' 命中；acme.localhost -> slug='acme' 命中。
   */
  async findByHost(rawHost?: string): Promise<Tenant | null> {
    if (!rawHost) return null;
    const host = rawHost.toLowerCase().split(':')[0];
    const cached = this.cache.get(host);
    if (cached) return cached;
    let t = host ? await this.repo.findOne({ where: { domain: host } }) : null;
    if (!t) {
      const sub = host.split('.')[0];
      if (sub && sub !== host) t = await this.repo.findOne({ where: { slug: sub } });
    }
    // 只缓存成功解析的结果：解析失败的 Host 不入缓存，避免被伪造 Host 撑爆内存
    if (t) this.cache.set(host, t);
    return t;
  }

  private invalidate() {
    this.cache.clear();
    this.slugCache.clear();
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

  /** 租户自助：返回当前租户（含只读元数据 + 解析后的结构化 config） */
  async getSelf(tenantId: number) {
    const t = await this.get(tenantId);
    let config: any = {};
    if (t.config) {
      try { config = JSON.parse(t.config); } catch { config = {}; }
    }
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain || '',
      status: t.status,
      maxCampuses: t.maxCampuses ?? null,
      expiresAt: t.expiresAt || null,
      config,
    };
  }

  /** 租户自助：仅更新 name 与结构化 config（深度合并 brand/theme/features） */
  async updateSelf(tenantId: number, d: UpdateTenantSelfDto) {
    const t = await this.get(tenantId);
    if (d.name !== undefined) t.name = d.name;
    if (d.config !== undefined) {
      let existing: any = {};
      if (t.config) {
        try { existing = JSON.parse(t.config); } catch { existing = {}; }
      }
      const merged: any = { ...existing, ...d.config };
      if (d.config.brand) merged.brand = { ...(existing.brand || {}), ...d.config.brand };
      if (d.config.theme) merged.theme = { ...(existing.theme || {}), ...d.config.theme };
      if (d.config.features) merged.features = { ...(existing.features || {}), ...d.config.features };
      t.config = JSON.stringify(merged);
    }
    await this.repo.save(t);
    this.invalidate();
    return this.getSelf(tenantId);
  }

  /** 按品牌域标识(slug 或 domain)解析租户（用于 用户名@品牌域 登录） */
  async findBySlugOrDomain(s: string): Promise<Tenant | null> {
    if (!s) return null;
    const key = s.toLowerCase().trim();
    const cached = this.slugCache.get(key);
    if (cached) return cached;
    let t = await this.repo.findOne({ where: { slug: key } });
    if (!t) t = await this.repo.findOne({ where: { domain: key } });
    if (t) this.slugCache.set(key, t);
    return t;
  }

  /** 可用性校验：停用 / 过期则拒绝（总域据此管控品牌域授权） */
  async assertUsable(tenantId: number) {
    const t = await this.repo.findOne({ where: { id: tenantId } });
    if (!t) return; // 表未初始化或未知租户时放行默认行为
    if (t.status === 'DISABLED') throw new UnauthorizedException('该机构已停用');
    if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('该机构已过期');
    }
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
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      maxCampuses: d.maxCampuses ?? null,
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
    if (d.expiresAt !== undefined) t.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
    if (d.maxCampuses !== undefined) t.maxCampuses = d.maxCampuses ?? null;
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
    const t = this.repo.create({
      id,
      slug,
      name,
      domain,
      status: 'ACTIVE',
      expiresAt: null,
      maxCampuses: null,
    });
    return this.repo.save(t);
  }
}
