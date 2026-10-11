import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository, FindOptionsWhere } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { PageQueryDto, PageResult } from '../dto/pagination.dto';
import { BusinessException } from '../exceptions/business.exception';
import { ResCode } from '../constants/response-code';
import { getOrgId } from '../org-context';

/**
 * 多租户 + 多校区 CRUD 基类：
 * - 所有写操作自动注入 tenantId；有 org_id 列的实体额外按校区上下文落章 orgId。
 * - 所有读操作按 tenantId 隔离；若请求携带校区上下文且有 org_id 列，则追加 orgId 过滤（校区独立）。
 * 子类通过 `super(repo)` 注入 Repository 即可获得标准能力（文档 §2.2 / §4.11）。
 */
@Injectable()
export class BaseService<T extends BaseEntity> {
  constructor(public readonly repo: Repository<T>) {}

  /** 当前实体是否带有 org_id 校区列 */
  private hasOrgColumn(): boolean {
    return this.repo.metadata.columns.some((c) => c.propertyName === 'orgId');
  }

  /** 合并校区上下文：仅在实体有 org_id 列且当前请求携带 orgId 时追加过滤/落章 */
  private scopeOrg(extra: Record<string, any> = {}): Record<string, any> {
    const orgId = getOrgId();
    if (orgId == null || !this.hasOrgColumn()) return extra;
    return { ...extra, orgId };
  }

  protected withTenant(tenantId: number, extra: FindOptionsWhere<T> = {}) {
    return { tenantId, ...this.scopeOrg(extra as Record<string, any>) } as FindOptionsWhere<T>;
  }

  async paginate(
    tenantId: number,
    q: PageQueryDto,
    where: FindOptionsWhere<T> = {},
    relations: string[] = [],
  ): Promise<PageResult<T>> {
    const [list, total] = await this.repo.findAndCount({
      where: this.withTenant(tenantId, where),
      relations,
      order: q.sortBy
        ? { [q.sortBy]: q.order } as any
        : { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return {
      list,
      total,
      page: q.page,
      size: q.size,
      totalPages: Math.ceil(total / q.size),
    };
  }

  async findAll(
    tenantId: number,
    where: FindOptionsWhere<T> = {},
    relations: string[] = [],
  ): Promise<T[]> {
    return this.repo.find({
      where: this.withTenant(tenantId, where),
      relations,
      order: { id: 'DESC' } as any,
    });
  }

  async findOne(tenantId: number, id: number, relations: string[] = []): Promise<T> {
    const e = await this.repo.findOne({
      where: this.withTenant(tenantId, { id } as FindOptionsWhere<T>),
      relations,
    });
    if (!e) throw new NotFoundException('资源不存在');
    return e;
  }

  async create(tenantId: number, dto: Partial<T>): Promise<T> {
    const entity: any = this.repo.create({ ...(dto as any), tenantId });
    const orgId = getOrgId();
    if (orgId != null && this.hasOrgColumn()) entity.orgId = orgId;
    return (await this.repo.save(entity)) as unknown as T;
  }

  async update(tenantId: number, id: number, dto: Partial<T>): Promise<T> {
    const e = await this.findOne(tenantId, id);
    Object.assign(e, dto);
    const orgId = getOrgId();
    if (orgId != null && this.hasOrgColumn()) (e as any).orgId = orgId;
    return (await this.repo.save(e)) as unknown as T;
  }

  async remove(tenantId: number, id: number): Promise<void> {
    const e = await this.findOne(tenantId, id);
    await this.repo.softRemove(e);
  }

  protected fail(code: ResCode, msg: string): never {
    throw new BusinessException(code, msg);
  }

  protected ids(value?: string | number | number[]): number[] | undefined {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : String(value).split(',').map(Number);
    return arr.filter((n) => !Number.isNaN(n));
  }
}
