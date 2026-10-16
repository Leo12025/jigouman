import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseService } from '../../common/crud/base.service';
import { Channel, ChannelExternalType } from './entities/channel.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignTemplate } from './entities/campaign-template.entity';
import { Lead, LeadStage } from './entities/lead.entity';
import { LeadFollow } from './entities/lead-follow.entity';
import { TrialLesson } from './entities/trial.entity';
import { StudentService } from '../student/student.service';
import { AiService } from '../../common/ai/ai.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateLeadDto,
  UpdateLeadDto,
  LeadPageQueryDto,
  FollowLeadDto,
  ConvertLeadDto,
  TrialLessonDto,
  FunnelQueryDto,
  CreateCampaignTemplateDto,
  UpdateCampaignTemplateDto,
  LaunchFromTemplateDto,
  IngestLeadsDto,
  ScoreLeadsDto,
} from './dto/lead.dto';

/**
 * 招生 + 线索（M3，文档 §4.2/§4.3/§5.2）。
 * 覆盖：渠道、市场活动、线索全生命周期（录入→分配→跟进→试听→转化）、转化漏斗。
 * 线索转化时联动 StudentModule 创建学员并绑定家长（CRM 与学员档案打通，§4.3）。
 */
@Injectable()
export class LeadService {
  private readonly channel = new BaseService<Channel>(null as any);
  private readonly campaign = new BaseService<Campaign>(null as any);
  private readonly template = new BaseService<CampaignTemplate>(null as any);
  private readonly lead = new BaseService<Lead>(null as any);
  private readonly follow = new BaseService<LeadFollow>(null as any);
  private readonly trial = new BaseService<TrialLesson>(null as any);

  constructor(
    @InjectRepository(Channel) channelRepo: Repository<Channel>,
    @InjectRepository(Campaign) campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignTemplate) templateRepo: Repository<CampaignTemplate>,
    @InjectRepository(Lead) leadRepo: Repository<Lead>,
    @InjectRepository(LeadFollow) followRepo: Repository<LeadFollow>,
    @InjectRepository(TrialLesson) trialRepo: Repository<TrialLesson>,
    private readonly studentSvc: StudentService,
    private readonly aiSvc: AiService,
  ) {
    this.channel = new BaseService(channelRepo);
    this.campaign = new BaseService(campaignRepo);
    this.template = new BaseService(templateRepo);
    this.lead = new BaseService(leadRepo);
    this.follow = new BaseService(followRepo);
    this.trial = new BaseService(trialRepo);
  }

  // ---------- 渠道 ----------
  createChannel(t: number, d: CreateChannelDto) {
    return this.channel.create(t, d);
  }
  listChannel(t: number) {
    return this.channel.findAll(t);
  }
  updateChannel(t: number, id: number, d: UpdateChannelDto) {
    return this.channel.update(t, id, d);
  }
  removeChannel(t: number, id: number) {
    return this.channel.remove(t, id);
  }

  // ---------- 市场活动 ----------
  createCampaign(t: number, d: CreateCampaignDto) {
    return this.campaign.create(t, d);
  }
  listCampaign(t: number) {
    return this.campaign.findAll(t);
  }
  updateCampaign(t: number, id: number, d: UpdateCampaignDto) {
    return this.campaign.update(t, id, d);
  }
  removeCampaign(t: number, id: number) {
    return this.campaign.remove(t, id);
  }

  // ---------- 线索 ----------
  /** 新线索：生命周期从 NEW 开始 */
  createLead(t: number, d: CreateLeadDto) {
    return this.lead.create(t, { ...d, stage: LeadStage.NEW });
  }

  async listLead(t: number, q: LeadPageQueryDto) {
    const qb = this.lead.repo
      .createQueryBuilder('l')
      .where('l.tenant_id = :t', { t });
    if (q.stage) qb.andWhere('l.stage = :stage', { stage: q.stage });
    if (q.ownerId) qb.andWhere('l.owner_id = :ownerId', { ownerId: q.ownerId });
    if (q.channelId) qb.andWhere('l.channel_id = :channelId', { channelId: q.channelId });
    if (q.campaignId) qb.andWhere('l.campaign_id = :campaignId', { campaignId: q.campaignId });
    if (q.keyword) {
      qb.andWhere('(l.name LIKE :kw OR l.phone LIKE :kw)', { kw: `%${q.keyword}%` });
    }
    qb.orderBy(`l.${q.sortBy || 'id'}`, q.order === 'asc' ? 'ASC' : 'DESC')
      .skip((q.page - 1) * q.size)
      .take(q.size);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  getLead(t: number, id: number) {
    return this.lead.findOne(t, id);
  }
  updateLead(t: number, id: number, d: UpdateLeadDto) {
    return this.lead.update(t, id, d);
  }
  removeLead(t: number, id: number) {
    return this.lead.remove(t, id);
  }

  /**
   * 分配线索给顾问：设置 ownerId，NEW → FOLLOWING（自动进入跟进阶段）。
   */
  async assignLead(t: number, id: number, ownerId: number) {
    const lead = await this.lead.findOne(t, id);
    lead.ownerId = ownerId;
    if (lead.stage === LeadStage.NEW) lead.stage = LeadStage.FOLLOWING;
    return this.lead.repo.save(lead);
  }

  /**
   * 跟进线索：写跟进记录，更新 lastFollowAt；NEW → FOLLOWING。
   */
  async followLead(t: number, id: number, d: FollowLeadDto, operatorId?: number) {
    const lead = await this.lead.findOne(t, id);
    const follow = await this.follow.create(t, {
      leadId: id,
      type: d.type,
      content: d.content,
      nextFollowAt: d.nextFollowAt ? new Date(d.nextFollowAt) : undefined,
      operatorId,
    });
    lead.lastFollowAt = new Date();
    if (lead.stage === LeadStage.NEW) lead.stage = LeadStage.FOLLOWING;
    await this.lead.repo.save(lead);
    return follow;
  }

  /**
   * 转化线索为学员（文档 §4.3 关键规则：报名后 CRM 与学员打通）。
   * 创建 Student 并自动绑定线索联系人作为主家长，回写 convertedStudentId。
   */
  async convertLead(t: number, id: number, d?: ConvertLeadDto) {
    const lead = await this.lead.findOne(t, id);
    if (lead.convertedStudentId) {
      return { leadId: lead.id, studentId: lead.convertedStudentId, already: true };
    }
    const student = await this.studentSvc.createStudent(t, {
      name: d?.studentName || lead.name,
      gender: d?.gender ?? lead.gender ?? 1,
    });
    // 自动绑定线索手机号为学员主联系人（来源标记为 lead）
    await this.studentSvc.bindParent(t, {
      studentId: student.id,
      parentName: `${lead.name}（家长）`,
      phone: lead.phone,
      relation: 'OTHER',
      isMain: true,
      bindSource: 'lead',
    });
    lead.stage = LeadStage.SIGNED;
    lead.convertedStudentId = student.id;
    await this.lead.repo.save(lead);
    return { leadId: lead.id, studentId: student.id, already: false };
  }

  /**
   * 安排/记录试听：到课后线索阶段推进到 TRIALED（已报名/无效除外）。
   */
  async createTrial(t: number, leadId: number, d: TrialLessonDto) {
    await this.lead.findOne(t, leadId);
    const trial = await this.trial.create(t, {
      leadId,
      lessonId: d.lessonId,
      trialAt: d.trialAt ? new Date(d.trialAt) : undefined,
      attended: d.attended ? 1 : 0,
      feedback: d.feedback,
    });
    if (d.attended) {
      const lead = await this.lead.findOne(t, leadId);
      if (lead.stage !== LeadStage.SIGNED && lead.stage !== LeadStage.INVALID) {
        lead.stage = LeadStage.TRIALED;
        await this.lead.repo.save(lead);
      }
    }
    return trial;
  }

  listTrial(t: number, leadId: number) {
    return this.trial.repo.find({
      where: { tenantId: t, leadId },
      order: { id: 'DESC' } as any,
    });
  }

  /** 跟进记录时间线（详情用，§4.3） */
  listFollow(t: number, leadId: number) {
    return this.follow.repo.find({
      where: { tenantId: t, leadId },
      order: { id: 'DESC' } as any,
    });
  }

  /**
   * 转化漏斗（文档 §4.2）：按渠道/活动筛选，统计各阶段数量与转化率。
   * 日期筛选在 JS 层做，规避 MySQL/SQLite 对 datetime 字符串的差异。
   */
  async funnel(t: number, q: FunnelQueryDto) {
    const qb = this.lead.repo
      .createQueryBuilder('l')
      .where('l.tenant_id = :t', { t });
    if (q.channelId) qb.andWhere('l.channel_id = :channelId', { channelId: q.channelId });
    if (q.campaignId) qb.andWhere('l.campaign_id = :campaignId', { campaignId: q.campaignId });
    let leads = await qb.getMany();

    if (q.start || q.end) {
      const start = q.start ? new Date(q.start).getTime() : -Infinity;
      const end = q.end ? new Date(q.end).getTime() : Infinity;
      leads = leads.filter((l) => {
        const ts = new Date(l.createdAt).getTime();
        return ts >= start && ts <= end;
      });
    }

    const byStage: Record<string, number> = {};
    for (const s of Object.values(LeadStage)) byStage[s] = 0;
    let total = 0;
    for (const l of leads) {
      byStage[l.stage] = (byStage[l.stage] || 0) + 1;
      total += 1;
    }
    const trialed = byStage[LeadStage.TRIALED] || 0;
    const signed = byStage[LeadStage.SIGNED] || 0;
    return {
      total,
      byStage,
      trialed,
      signed,
      conversionRate: total ? Number((signed / total).toFixed(4)) : 0,
    };
  }

  // ---------------- 活动模板库（§4.2 营销增强） ----------------
  createTemplate(t: number, d: CreateCampaignTemplateDto) {
    return this.template.create(t, d);
  }
  listTemplate(t: number) {
    return this.template.findAll(t);
  }
  updateTemplate(t: number, id: number, d: UpdateCampaignTemplateDto) {
    return this.template.update(t, id, d);
  }
  removeTemplate(t: number, id: number) {
    return this.template.remove(t, id);
  }

  /** 一键发起：从模板复制为正式活动 */
  async launchFromTemplate(t: number, id: number, d: LaunchFromTemplateDto) {
    const tp = await this.template.findOne(t, id);
    const cfg: any = tp.configJson ? JSON.parse(tp.configJson as any) : {};
    return this.campaign.create(t, {
      name: tp.name,
      type: (tp.type as any) || 'OTHER',
      startTime: d.startTime || cfg.startTime,
      endTime: d.endTime || cfg.endTime,
      budget: d.budget ?? cfg.budget ?? tp.status ? undefined : undefined,
      status: 1,
    } as any);
  }

  // ---------------- 渠道直连入库（§4.2 营销增强） ----------------
  /**
   * 外部渠道线索自动入库（抖音/美团/微信广告）：
   * - 校验渠道开启直连(ingestEnabled)且 externalType 非 NONE；
   * - 支持 simulated 模拟拉取 sampleCount 条样本（无真实网关时联调用）；
   * - 真实场景由 d.items 传入外部线索，按 phone+channelId 去重，避免重复入库；
   * - 入库线索 stage=NEW、source=externalType，与手工录入统一走 CRM 漏斗。
   */
  async ingestLeads(t: number, d: IngestLeadsDto) {
    const channel = await this.channel.findOne(t, d.channelId);
    if (!channel.ingestEnabled) {
      throw new NotFoundException('该渠道未开启外部线索直连');
    }
    const ext = channel.externalType || ChannelExternalType.NONE;
    if (ext === ChannelExternalType.NONE) {
      throw new NotFoundException('该渠道未配置外部直连来源类型');
    }
    let items = d.item || [];
    if (d.simulated) {
      const n = Math.min(50, d.simulateCount || 5);
      const surnames = ['张', '王', '李', '赵', '陈', '刘', '杨'];
      const courses = ['少儿编程', '钢琴', '美术', '篮球', '英语', '书法'];
      items = Array.from({ length: n }, (_, i) => ({
        name: `${surnames[i % surnames.length]}${['小朋友', '同学', '家长'][i % 3]}`,
        phone: `139${String(10000000 + i * 137).slice(0, 8)}`,
        intentionCourse: courses[i % courses.length],
        externalId: `SIM-${Date.now()}-${i}`,
      }));
    }
    const created: any[] = [];
    const skipped: string[] = [];
    for (const it of items) {
      const dup = await this.lead.repo.findOne({
        where: { tenantId: t, phone: it.phone, channelId: d.channelId } as any,
      });
      if (dup) {
        skipped.push(it.phone);
        continue;
      }
      created.push(
        await this.lead.create(t, {
          name: it.name,
          phone: it.phone,
          channelId: d.channelId,
          campaignId: d.campaignIdNum,
          stage: LeadStage.NEW,
          intentionCourse: it.intentionCourse,
          gender: it.gender,
          age: it.age,
          budget: it.budget,
          source: ext,
          remark: it.remark || (it.externalId ? `外部直连 ${it.externalId}` : '外部直连入库'),
        } as any),
      );
    }
    return { ingested: created.length, skipped: skipped.length, total: items.length };
  }

  // ---------------- AI 线索评分（§4.2 营销增强） ----------------
  /** 计算评分（确定性启发式，可选 LLM 增强理由）；返回 {score, level, reasons} */
  private async computeScore(t: number, lead: Lead): Promise<{ score: number; level: string; reasons: string[] }> {
    const reasons: string[] = [];
    let score = 30; // 基础分
    const ext = lead.source;
    if (ext === 'DOUYIN' || ext === 'WECHAT_ADS') {
      score += 15;
      reasons.push('高意向外部广告来源');
    } else if (ext === 'REFERRED') {
      score += 12;
      reasons.push('转介绍来源，信任度高');
    } else if (ext === 'WECHAT') {
      score += 6;
      reasons.push('私域来源');
    }
    if (lead.intentionCourse) {
      score += 8;
      reasons.push('已明确意向课程');
    }
    if (lead.budget && lead.budget > 0) {
      score += 10;
      reasons.push(`预算明确(${lead.budget})`);
    }
    const follows = await this.follow.repo.find({ where: { tenantId: t, leadId: lead.id } as any });
    if (follows.length > 0) {
      score += Math.min(20, follows.length * 6);
      reasons.push(`已跟进 ${follows.length} 次`);
    }
    const trials = await this.trial.repo.find({ where: { tenantId: t, leadId: lead.id } as any });
    if (trials.some((x) => x.attended)) {
      score += 20;
      reasons.push('已到店试听，转化概率高');
    }
    if (lead.lastFollowAt) {
      const days = (Date.now() - new Date(lead.lastFollowAt as any).getTime()) / 86400_000;
      if (days <= 3) {
        score += 7;
        reasons.push('近期有跟进，活跃度高');
      } else if (days > 14) {
        score -= 8;
        reasons.push('超 14 天未跟进，存在流失风险');
      }
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MID' : 'LOW';

    // 可选：用 LLM 丰富理由（未配置则保留启发式）
    const llm = await this.aiSvc.llm(
      '你是教培招生顾问，依据线索特征输出 1-3 条简短的转化建议，每条不超过 20 字，用换行分隔。仅给建议，不要解释。',
      `姓名${lead.name}，来源${ext || '未知'}，意向${lead.intentionCourse || '未定'}，跟进${follows.length}次，试听${trials.some((x) => x.attended) ? '已到店' : '未到店'}，评分${score}。`,
    );
    if (llm) {
      const lines = AiService.splitLines(llm);
      if (lines.length) reasons.push(...lines.slice(0, 3).map((x) => `建议:${x}`));
    }
    return { score, level, reasons };
  }

  /** 对单条线索评分并落库（AI 辅助，需人工复核） */
  async scoreLead(t: number, id: number) {
    const lead = await this.lead.findOne(t, id);
    const r = await this.computeScore(t, lead);
    lead.score = r.score;
    lead.scoreLevel = r.level;
    lead.scoreReason = r.reasons.join('；');
    await this.lead.repo.save(lead);
    return { id: lead.id, score: r.score, level: r.level, reasons: r.reasons };
  }

  /** 批量评分（默认仅未转化活跃线索；onlyActive=false 则全量） */
  async scoreAll(t: number, d?: ScoreLeadsDto) {
    const qb = this.lead.repo
      .createQueryBuilder('l')
      .where('l.tenant_id = :t', { t });
    if (d?.onlyActive) {
      qb.andWhere('l.stage IN (:...s)', { s: [LeadStage.NEW, LeadStage.FOLLOWING, LeadStage.TRIALED] });
    }
    const leads = await qb.getMany();
    const dist: Record<string, number> = { HIGH: 0, MID: 0, LOW: 0 };
    for (const lead of leads) {
      const r = await this.computeScore(t, lead);
      lead.score = r.score;
      lead.scoreLevel = r.level;
      lead.scoreReason = r.reasons.join('；');
      await this.lead.repo.save(lead);
      dist[r.level] = (dist[r.level] || 0) + 1;
    }
    return { scanned: leads.length, distribution: dist };
  }

  /** 按评分排序返回优先跟进线索（顾问聚焦高价值线索，§4.2） */
  async rankedLeads(t: number, q: { limit?: number; level?: string } = {}) {
    const where: any = { tenantId: t };
    if (q.level) where.scoreLevel = q.level;
    const list = await this.lead.repo.find({ where, order: { score: 'DESC' } as any });
    const limit = q.limit || 20;
    return list.slice(0, limit).map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      stage: l.stage,
      score: l.score,
      level: l.scoreLevel,
      reason: l.scoreReason,
    }));
  }
}
