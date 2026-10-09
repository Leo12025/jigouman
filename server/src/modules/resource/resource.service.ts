import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Resource } from './entities/resource.entity';
import { StorageService } from './storage/storage.service';
import { UploadedFile } from './storage/storage-driver.interface';
import { ResourcePageQueryDto, UploadMeta } from './dto/resource.dto';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource) private readonly repo: Repository<Resource>,
    private readonly storage: StorageService,
  ) {}

  /** 批量上传并落库（文档 §4.1 统一资源） */
  async upload(tenantId: number, files: UploadedFile[], meta: UploadMeta) {
    const category = meta.category || 'other';
    const prefix = `r/${category}`;
    const out: Resource[] = [];
    for (const f of files) {
      const stored = await this.storage.saveUploaded(f, prefix);
      const r = this.repo.create({
        tenantId,
        ownerId: meta.ownerId,
        originalName: f.originalname,
        key: stored.key,
        storageType: this.storage.type,
        bucket: stored.bucket,
        mimeType: f.mimetype,
        ext: path.extname(f.originalname),
        size: f.size,
        url: stored.url,
        category,
        refType: meta.refType,
        refId: meta.refId,
      } as Resource);
      out.push(await this.repo.save(r as any));
    }
    return out;
  }

  async list(tenantId: number, q: ResourcePageQueryDto) {
    const where: any = { tenantId };
    if (q.category) where.category = q.category;
    if (q.refType) where.refType = q.refType;
    if (q.refId) where.refId = q.refId;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.storageType) where.storageType = q.storageType;
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async get(tenantId: number, id: number) {
    const r = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!r) throw new NotFoundException('资源不存在');
    return r;
  }

  /** 删除：软删记录 + 删除底层存储对象 */
  async remove(tenantId: number, id: number) {
    const r = await this.get(tenantId, Number(id));
    await this.repo.softDelete({ tenantId, id: r.id });
    await this.storage.remove(r.key).catch(() => undefined);
    return { id: r.id };
  }
}
