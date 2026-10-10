import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { GroupBuyActivity } from './entities/group-buy-activity.entity';
import { GroupBuyTeam } from './entities/group-buy-team.entity';
import { GroupBuyMember } from './entities/group-buy-member.entity';
import { CreateGroupBuyActivityDto, UpdateGroupBuyActivityDto, CreateTeamDto, JoinTeamDto, GroupBuyPageQueryDto } from './dto/groupbuy.dto';

function randCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

@Injectable()
export class GroupBuyService {
  constructor(
    @InjectRepository(GroupBuyActivity) private readonly act: Repository<GroupBuyActivity>,
    @InjectRepository(GroupBuyTeam) private readonly team: Repository<GroupBuyTeam>,
    @InjectRepository(GroupBuyMember) private readonly member: Repository<GroupBuyMember>,
  ) {}

  async createActivity(tenantId: number, d: CreateGroupBuyActivityDto) {
    const a = this.act.create({
      tenantId,
      groupSize: d.groupSize || 2,
      startTime: d.startTime ? new Date(d.startTime) : undefined,
      endTime: d.endTime ? new Date(d.endTime) : undefined,
      ...(d as any),
    } as GroupBuyActivity);
    return this.act.save(a as any);
  }
  async listActivities(tenantId: number, q: GroupBuyPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.act.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async getActivity(tenantId: number, id: number) {
    const a = await this.act.findOne({ where: { tenantId, id } as any });
    if (!a) throw new BusinessException(ResCode.BAD_REQUEST, '活动不存在');
    return a;
  }
  async updateActivity(tenantId: number, id: number, d: UpdateGroupBuyActivityDto) {
    const a = await this.getActivity(tenantId, id);
    Object.assign(a, d as any);
    return this.act.save(a as any);
  }
  async removeActivity(tenantId: number, id: number) {
    await this.getActivity(tenantId, id);
    await this.act.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 开团 */
  async createTeam(tenantId: number, d: CreateTeamDto) {
    const a = await this.getActivity(tenantId, d.activityId);
    if (a.status !== 'ACTIVE') throw new BusinessException(ResCode.BAD_REQUEST, '活动未启用');
    const code = randCode('GB');
    const t = this.team.create({ tenantId, activityId: d.activityId, code, leaderStudentId: d.leaderStudentId, currentSize: 1 } as GroupBuyTeam);
    const saved = await this.team.save(t as any);
    await this.member.save(this.member.create({ tenantId, teamId: saved.id, studentId: d.leaderStudentId } as GroupBuyMember) as any);
    return saved;
  }

  /** 参团：满员自动成团 */
  async joinTeam(tenantId: number, d: JoinTeamDto) {
    const t = await this.team.findOne({ where: { tenantId, code: d.code } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    if (t.status !== 'OPEN') throw new BusinessException(ResCode.BAD_REQUEST, '拼团已结束');
    const dup = await this.member.findOne({ where: { tenantId, teamId: t.id, studentId: d.studentId } as any });
    if (dup) throw new BusinessException(ResCode.BAD_REQUEST, '不可重复参团');
    await this.member.save(this.member.create({ tenantId, teamId: t.id, studentId: d.studentId } as GroupBuyMember) as any);
    const a = await this.getActivity(tenantId, t.activityId);
    t.currentSize += 1;
    if (t.currentSize >= a.groupSize) {
      t.status = 'SUCCESS';
      t.successAt = new Date();
    }
    return this.team.save(t as any);
  }

  async listTeams(tenantId: number, activityId: number) {
    return this.team.find({ where: { tenantId, activityId } as any, order: { id: 'DESC' } as any });
  }

  /** 核销：仅已成团可核销 */
  async redeem(tenantId: number, code: string) {
    const t = await this.team.findOne({ where: { tenantId, code } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    if (t.status !== 'SUCCESS') throw new BusinessException(ResCode.BAD_REQUEST, '未成团，不可核销');
    return { code, status: 'REDEEMED' };
  }
}
