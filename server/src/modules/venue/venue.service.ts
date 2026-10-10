import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Classroom } from './entities/classroom.entity';
import { CreateClassroomDto, UpdateClassroomDto, ClassroomPageQueryDto } from './dto/venue.dto';

@Injectable()
export class VenueService {
  constructor(@InjectRepository(Classroom) private readonly repo: Repository<Classroom>) {}

  async create(tenantId: number, d: CreateClassroomDto) {
    const c = this.repo.create({ tenantId, ...(d as any) } as Classroom);
    return this.repo.save(c as any);
  }

  async list(tenantId: number, q: ClassroomPageQueryDto) {
    const where: any = { tenantId };
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async get(tenantId: number, id: number) {
    const c = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!c) throw new NotFoundException('教室不存在');
    return c;
  }

  async update(tenantId: number, id: number, d: UpdateClassroomDto) {
    const c = await this.get(tenantId, id);
    Object.assign(c, d as any);
    return this.repo.save(c as any);
  }

  async remove(tenantId: number, id: number) {
    await this.get(tenantId, id);
    await this.repo.softDelete({ tenantId, id } as any);
    return { id };
  }
}
