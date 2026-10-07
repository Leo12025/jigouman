import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { PageQueryDto, PageResult } from '../dto/pagination.dto';
import { BusinessException } from '../exceptions/business.exception';
import { ResCode } from '../constants/response-code';

/**
 * 多租户 CRUD 基类：所有写操作自动注入 tenantId，
 * 所有读操作按 tenantId 隔离（文档 §2.2 单库多租户）。
 * 子类通过 `super(repo)` 注入 Repository 即可获得标准能力。
 */
@Injectable()
export class BaseService<T extends BaseEntity> {
  constructor(public readonly repo: Repository<T>) {}

  protected withTenant(tenantId: number, extra: FindOptionsWhere<T> = {}) {
    return { tenantId, ...extra } as FindOptionsWhere<T>;
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
    const entity = this.repo.create({ ...(dto as any), tenantId });
    return (await this.repo.save(entity)) as unknown as T;
  }

  async update(tenantId: number, id: number, dto: Partial<T>): Promise<T> {
    const e = await this.findOne(tenantId, id);
    Object.assign(e, dto);
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
