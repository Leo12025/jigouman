import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseStage } from './entities/course-stage.entity';
import { Courseware } from './entities/courseware.entity';
import {
  CreateStageDto, UpdateStageDto, CreateCoursewareDto, UpdateCoursewareDto,
  CoursewarePageQueryDto,
} from './dto/courseware.dto';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class CoursewareService {
  private readonly stageRepo: Repository<CourseStage>;
  private readonly cwRepo: Repository<Courseware>;
  constructor(
    @InjectRepository(CourseStage) stageRepo: Repository<CourseStage>,
    @InjectRepository(Courseware) cwRepo: Repository<Courseware>,
  ) {
    this.stageRepo = orgRepo(stageRepo);
    this.cwRepo = orgRepo(cwRepo);
  }

  // ---------------- 阶段 ----------------
  async createStage(tenantId: number, courseId: number, d: CreateStageDto) {
    const s = this.stageRepo.create({
      tenantId, courseId, name: d.name, sortOrder: d.sortOrder ?? 0,
      outlineResourceId: d.outlineResourceId, outlineUrl: d.outlineUrl, remark: d.remark,
    } as CourseStage);
    return this.stageRepo.save(s as any);
  }

  async updateStage(tenantId: number, id: number, d: UpdateStageDto) {
    const s = await this.stageRepo.findOne({ where: { tenantId, id } as any });
    if (!s) throw new NotFoundException('阶段不存在');
    Object.assign(s, {
      name: d.name ?? s.name,
      sortOrder: d.sortOrder ?? s.sortOrder,
      outlineResourceId: d.outlineResourceId ?? s.outlineResourceId,
      outlineUrl: d.outlineUrl ?? s.outlineUrl,
      remark: d.remark ?? s.remark,
    });
    return this.stageRepo.save(s as any);
  }

  async removeStage(tenantId: number, id: number) {
    const s = await this.stageRepo.findOne({ where: { tenantId, id } as any });
    if (!s) throw new NotFoundException('阶段不存在');
    await this.stageRepo.softDelete({ tenantId, id: s.id });
    await this.cwRepo.delete({ tenantId, stageId: s.id } as any);
    return { id: s.id };
  }

  /** 课程阶段树（含每阶段下的课件） */
  async tree(tenantId: number, courseId: number) {
    const stages = await this.stageRepo.find({
      where: { tenantId, courseId } as any, order: { sortOrder: 'ASC', id: 'ASC' } as any,
    });
    const cws = await this.cwRepo.find({
      where: { tenantId, courseId } as any, order: { sortOrder: 'ASC', id: 'ASC' } as any,
    });
    return stages.map((s) => ({
      ...(s as any),
      coursewares: cws.filter((c) => Number(c.stageId) === Number(s.id)),
    }));
  }

  // ---------------- 课件 ----------------
  async createCourseware(tenantId: number, stageId: number, d: CreateCoursewareDto) {
    const stage = await this.stageRepo.findOne({ where: { tenantId, id: stageId } as any });
    if (!stage) throw new NotFoundException('阶段不存在');
    const cw = this.cwRepo.create({
      tenantId, courseId: stage.courseId, stageId: stage.id, title: d.title,
      type: d.type || 'PPT', sortOrder: d.sortOrder ?? 0, resourceId: d.resourceId,
      url: d.url, durationMinutes: d.durationMinutes,
      resources: d.resources ? JSON.stringify(d.resources) : undefined, remark: d.remark,
    } as Courseware);
    return this.cwRepo.save(cw as any);
  }

  async updateCourseware(tenantId: number, id: number, d: UpdateCoursewareDto) {
    const cw = await this.cwRepo.findOne({ where: { tenantId, id } as any });
    if (!cw) throw new NotFoundException('课件不存在');
    Object.assign(cw, {
      title: d.title ?? cw.title,
      type: d.type ?? cw.type,
      sortOrder: d.sortOrder ?? cw.sortOrder,
      resourceId: d.resourceId ?? cw.resourceId,
      url: d.url ?? cw.url,
      durationMinutes: d.durationMinutes ?? cw.durationMinutes,
      resources: d.resources ? JSON.stringify(d.resources) : cw.resources,
      remark: d.remark ?? cw.remark,
    });
    return this.cwRepo.save(cw as any);
  }

  async removeCourseware(tenantId: number, id: number) {
    const cw = await this.cwRepo.findOne({ where: { tenantId, id } as any });
    if (!cw) throw new NotFoundException('课件不存在');
    await this.cwRepo.softDelete({ tenantId, id: cw.id });
    return { id: cw.id };
  }

  async listCoursewares(tenantId: number, q: CoursewarePageQueryDto) {
    const where: any = { tenantId };
    if (q.courseId) where.courseId = q.courseId;
    if (q.stageId) where.stageId = q.stageId;
    const [list, total] = await this.cwRepo.findAndCount({
      where, order: { sortOrder: 'ASC', id: 'ASC' } as any,
      skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }
}
