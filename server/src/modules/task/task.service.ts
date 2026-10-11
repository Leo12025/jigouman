import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, TaskPageQueryDto } from './dto/task.dto';
import { TASK_TYPE_LABELS, TASK_SEVERE_OVERDUE_HOURS } from './task-types';
import { NotificationService } from '../notification/notification.service';

import { orgRepo } from '../../common/org-scope';

export interface TaskView extends Task {
  /** 是否已逾期（status=TODO 且已超过截止时间） */
  overdue: boolean;
  /** 超期小时数（负数=未到期，null=无截止时间） */
  overdueHours: number | null;
  /** 是否严重逾期（超期达到升级阈值） */
  severeOverdue: boolean;
}

@Injectable()
export class TaskService {
  private readonly repo: Repository<Task>;
  constructor(
    @InjectRepository(Task) repo: Repository<Task>,
    private readonly notifySvc: NotificationService,
  ) {
    this.repo = orgRepo(repo);
  }

  /** 派生逾期信息（§4.26 逾期提醒/升级的数据基础） */
  private decorate(t: Task): TaskView {
    const now = Date.now();
    const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
    const overdue = t.status === TaskStatus.TODO && due !== null && due < now;
    const overdueHours = due !== null ? Math.round((now - due) / 3600000) : null;
    const severeOverdue =
      overdue && overdueHours !== null && overdueHours >= TASK_SEVERE_OVERDUE_HOURS;
    return { ...(t as any), overdue, overdueHours, severeOverdue };
  }

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
    const saved = await this.repo.save(task as any);
    // 提醒推送：创建即通知负责人（站内，§4.26 逾期提醒/升级的触达基础）
    if (saved.assigneeId) {
      try {
        await this.notifySvc.create(tenantId, {
          userId: saved.assigneeId,
          type: 'TASK_ASSIGNED',
          title: '新的待办',
          content: `您有一条待办：${saved.title}`,
          refType: saved.type,
          refId: saved.id,
        });
      } catch {
        /* 通知失败不阻断任务创建 */
      }
    }
    return saved;
  }

  /** 幂等生成待办：同 (type,refType,refId) 已存在未完成任务则不重复创建 */
  async ensurePending(tenantId: number, d: CreateTaskDto): Promise<Task> {
    const exist = await this.repo.findOne({
      where: {
        tenantId,
        type: d.type,
        refType: d.refType,
        refId: d.refId,
        assigneeId: d.assigneeId,
        status: TaskStatus.TODO,
      } as any,
    });
    if (exist) return exist;
    return this.create(tenantId, d);
  }

  /** 关闭关联待办：业务完成后回流（§4.26「任务完成即关闭并回流对应业务」） */
  async closeByRef(
    tenantId: number,
    type: string,
    refType: string,
    refId: number,
    operatorId?: number,
  ) {
    const task = await this.repo.findOne({
      where: { tenantId, type, refType, refId, status: TaskStatus.TODO } as any,
    });
    if (!task) return;
    task.status = TaskStatus.DONE;
    task.completedAt = new Date();
    task.completedBy = operatorId;
    await this.repo.save(task as any);
  }

  /** 关闭某业务单据下全部待办（ROLE 节点多审批人，任一通过后关闭所有成员任务） */
  async closeByRefAll(
    tenantId: number,
    refType: string,
    refId: number,
    type = 'APPROVAL',
    operatorId?: number,
  ) {
    const tasks = await this.repo.find({
      where: { tenantId, type, refType, refId, status: TaskStatus.TODO } as any,
    });
    for (const t of tasks) {
      t.status = TaskStatus.DONE;
      t.completedAt = new Date();
      t.completedBy = operatorId;
      await this.repo.save(t as any);
    }
  }

  async list(tenantId: number, q: TaskPageQueryDto) {
    const where: any = { tenantId };
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.refType) where.refType = q.refType;
    if (q.refId) where.refId = q.refId;
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return {
      list: list.map((t) => this.decorate(t)),
      total,
      page: q.page,
      size: q.size,
      totalPages: Math.ceil(total / q.size),
    };
  }

  /** 我的待办（按当前登录用户），支持类型/状态/逾期过滤（§6.20 GET /api/v1/todos） */
  async myTasks(tenantId: number, userId: number, q: TaskPageQueryDto) {
    // 默认仅未办（TODO）；显式传入 status 时按传入值（§6.20「我的待办」）
    const where: any = { tenantId, assigneeId: userId, status: TaskStatus.TODO };
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    const all = await this.repo.find({ where, order: { id: 'DESC' } as any });
    let decorated = all.map((t) => this.decorate(t));
    if (q.overdue === 1) decorated = decorated.filter((t) => t.overdue);
    const total = decorated.length;
    const start = (q.page - 1) * q.size;
    const list = decorated.slice(start, start + q.size);
    return {
      list,
      total,
      page: q.page,
      size: q.size,
      totalPages: Math.ceil(total / q.size),
    };
  }

  /** 聚合统计：总待办、逾期、严重逾期、按类型分布（供待办中心页/首页） */
  async stats(tenantId: number, scopeUserId?: number) {
    const where: any = { tenantId, status: TaskStatus.TODO };
    if (scopeUserId) where.assigneeId = scopeUserId;
    const all = await this.repo.find({ where });
    const now = Date.now();
    let overdue = 0;
    let severeOverdue = 0;
    const byTypeMap = new Map<string, number>();
    for (const t of all) {
      const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
      const isOver = due !== null && due < now;
      if (isOver) {
        overdue++;
        if ((now - due) / 3600000 >= TASK_SEVERE_OVERDUE_HOURS) severeOverdue++;
      }
      byTypeMap.set(t.type, (byTypeMap.get(t.type) || 0) + 1);
    }
    const byType = [...byTypeMap.entries()].map(([type, count]) => ({
      type,
      label: TASK_TYPE_LABELS[type] || type,
      count,
    }));
    return { total: all.length, overdue, severeOverdue, byType };
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
