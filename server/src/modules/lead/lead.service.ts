import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BaseService } from '../../common/crud/base.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { Channel } from './entities/channel.entity';
import { Campaign } from './entities/campaign.entity';
import { Lead, LeadStage } from './entities/lead.entity';
import { LeadFollow } from './entities/lead-follow.entity';
import { TrialLesson } from './entities/trial.entity';
import { StudentService } from '../student/student.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateLeadDto,
  UpdateLeadDto,
  LeadPageQueryDto,
  AssignLeadDto,
  FollowLeadDto,
  ConvertLeadDto,
  TrialLessonDto,
  FunnelQueryDto,
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
  private readonly lead = new BaseService<Lead>(null as any);
  private readonly follow = new BaseService<LeadFollow>(null as any);
  private readonly trial = new BaseService<TrialLesson>(null as any);

  constructor(
    @InjectRepository(Channel) channelRepo: Repository<Channel>,
    @InjectRepository(Campaign) campaignRepo: Repository<Campaign>,
    @InjectRepository(Lead) leadRepo: Repository<Lead>,
    @InjectRepository(LeadFollow) followRepo: Repository<LeadFollow>,
    @InjectRepository(TrialLesson) trialRepo: Repository<TrialLesson>,
    private readonly studentSvc: StudentService,
  ) {
    this.channel = new BaseService(channelRepo);
    this.campaign = new BaseService(campaignRepo);
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
   * 日期筛选在 JS 层做，规避 MySQL/sql.js 对 datetime 字符串的差异。
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
}
