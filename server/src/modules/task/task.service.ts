import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, TaskPageQueryDto } from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(@InjectRepository(Task) private readonly repo: Repository<Task>) {}

  async create(tenantId: number, d: CreateTaskDto) {
    const task = this.repo.create({
      tenantId,
      type: d.type,
      title: d.title,
      assigneeId: d.assigneeId,
      refType: d.refType,
      refId: d.refId,
      dueAt: d.dueAt ? new Date(d.dueAt) : undefined,
      status: TaskStatus.TODO,
    } as Task);
    return this.repo.save(task as any);
  }

  async list(tenantId: number, q: TaskPageQueryDto) {
    const where: any = { tenantId };
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.refType) where.refType = q.refType;
    if (q.refId) where.refId = q.refId;
    const [list, total] = await this.repo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async complete(tenantId: number, id: number, operatorId?: number) {
    const task = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!task) throw new NotFoundException('任务不存在');
    task.status = TaskStatus.DONE;
    task.completedAt = new Date();
    task.completedBy = operatorId;
    return this.repo.save(task as any);
  }

  async remove(tenantId: number, id: number) {
    const task = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!task) throw new NotFoundException('任务不存在');
    await this.repo.remove(task as any);
    return { id };
  }
}
