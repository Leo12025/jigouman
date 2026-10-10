import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyTemplate } from './entities/survey-template.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import {
  CreateSurveyTemplateDto, UpdateSurveyTemplateDto, SubmitSurveyDto, SurveyPageQueryDto,
} from './dto/survey.dto';

@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(SurveyTemplate) private readonly tpl: Repository<SurveyTemplate>,
    @InjectRepository(SurveyResponse) private readonly resp: Repository<SurveyResponse>,
  ) {}

  // ---- 模板 ----
  async createTemplate(tenantId: number, d: CreateSurveyTemplateDto) {
    const t = this.tpl.create({ tenantId, ...(d as any) } as SurveyTemplate);
    return this.tpl.save(t as any);
  }
  async listTemplates(tenantId: number, q: SurveyPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.tpl.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async getTemplate(tenantId: number, id: number) {
    const t = await this.tpl.findOne({ where: { tenantId, id } as any });
    if (!t) throw new NotFoundException('问卷不存在');
    return t;
  }
  async updateTemplate(tenantId: number, id: number, d: UpdateSurveyTemplateDto) {
    const t = await this.getTemplate(tenantId, id);
    Object.assign(t, d as any);
    return this.tpl.save(t as any);
  }
  async removeTemplate(tenantId: number, id: number) {
    await this.getTemplate(tenantId, id);
    await this.tpl.softDelete({ tenantId, id } as any);
    return { id };
  }

  // ---- 回收 ----
  async submit(tenantId: number, d: SubmitSurveyDto) {
    const tpl = await this.getTemplate(tenantId, d.templateId);
    if (tpl.status !== 'ACTIVE') throw new NotFoundException('问卷未启用');
    const r = this.resp.create({
      tenantId, templateId: d.templateId, studentId: d.studentId,
      score: d.score, answers: d.answers,
    } as SurveyResponse);
    return this.resp.save(r as any);
  }

  async listResponses(tenantId: number, q: SurveyPageQueryDto) {
    const where: any = { tenantId };
    if (q.templateId) where.templateId = q.templateId;
    if (q.studentId) where.studentId = q.studentId;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.resp.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  /** 统计：样本数 / 平均分(NPS) / 分布 */
  async stats(tenantId: number, templateId: number) {
    const list = await this.resp.find({ where: { tenantId, templateId } as any });
    const count = list.length;
    const scores = list.map((r) => r.score).filter((s): s is number => typeof s === 'number');
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0;
    const dist: Record<string, number> = {};
    for (const s of scores) dist[String(s)] = (dist[String(s)] || 0) + 1;
    return { templateId, count, avgScore: avg, distribution: dist };
  }
}
