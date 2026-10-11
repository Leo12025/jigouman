import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint, ComplaintStatus } from './entities/complaint.entity';
import {
  CreateComplaintDto, AssignComplaintDto, ResolveComplaintDto, ComplaintPageQueryDto,
} from './dto/complaint.dto';
import { TaskService } from '../task/task.service';

const TASK_TYPE = 'COMPLAINT';
const REF_TYPE = 'COMPLAINT';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class ComplaintService {
  private readonly repo: Repository<Complaint>;
  constructor(
    @InjectRepository(Complaint) repo: Repository<Complaint>,
    private readonly taskSvc: TaskService,
  ) {
    this.repo = orgRepo(repo);
  }

  /** 登记客诉；若建单即分派则生成 COMPLAINT 待办并通知处理人（§4.26 事件化来源） */
  async create(tenantId: number, d: CreateComplaintDto, operatorId?: number) {
    const c = this.repo.create({
      tenantId,
      studentId: d.studentId,
      courseId: d.courseId,
      title: d.title,
      content: d.content,
      channel: d.channel || 'OTHER',
      level: d.level || 'MEDIUM',
      status: d.assigneeId ? ComplaintStatus.PROCESSING : ComplaintStatus.PENDING,
      assigneeId: d.assigneeId,
      createdBy: operatorId,
    } as Complaint);
    const saved = await this.repo.save(c as any);
    if (saved.assigneeId) {
      await this.taskSvc.ensurePending(tenantId, {
        type: TASK_TYPE,
        title: `客诉处理：${saved.title}`,
        assigneeId: saved.assigneeId,
        refType: REF_TYPE,
        refId: saved.id,
      });
    }
    return saved;
  }

  /** 分派/改派处理人：关闭旧待办，给新处理人生成待办并通知 */
  async assign(tenantId: number, id: number, d: AssignComplaintDto) {
    const c = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!c) throw new NotFoundException('客诉不存在');
    c.assigneeId = d.assigneeId;
    c.status = ComplaintStatus.PROCESSING;
    const saved = await this.repo.save(c as any);
    await this.taskSvc.closeByRefAll(tenantId, REF_TYPE, saved.id, TASK_TYPE);
    await this.taskSvc.ensurePending(tenantId, {
      type: TASK_TYPE,
      title: `客诉处理：${saved.title}`,
      assigneeId: saved.assigneeId,
      refType: REF_TYPE,
      refId: saved.id,
    });
    return saved;
  }

  /** 处理完成：标记结论并关闭全部 COMPLAINT 待办 */
  async resolve(tenantId: number, id: number, d: ResolveComplaintDto, operatorId?: number) {
    const c = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!c) throw new NotFoundException('客诉不存在');
    c.status = ComplaintStatus.RESOLVED;
    c.resolution = d.resolution;
    c.resolvedAt = new Date();
    const saved = await this.repo.save(c as any);
    await this.taskSvc.closeByRefAll(tenantId, REF_TYPE, saved.id, TASK_TYPE, operatorId);
    return saved;
  }

  async list(tenantId: number, q: ComplaintPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.level) where.level = q.level;
    if (q.assigneeId) where.assigneeId = q.assigneeId;
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
    if (!c) throw new NotFoundException('客诉不存在');
    return c;
  }
}
