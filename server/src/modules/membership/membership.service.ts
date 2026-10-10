import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { MemberLevel } from './entities/member-level.entity';
import { Member } from './entities/member.entity';
import { PointLedger } from './entities/point-ledger.entity';
import {
  CreateMemberLevelDto, UpdateMemberLevelDto, AdjustPointsDto, MemberPageQueryDto,
} from './dto/membership.dto';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MemberLevel) private readonly level: Repository<MemberLevel>,
    @InjectRepository(Member) private readonly member: Repository<Member>,
    @InjectRepository(PointLedger) private readonly ledger: Repository<PointLedger>,
  ) {}

  // ---- 等级 ----
  async createLevel(tenantId: number, d: CreateMemberLevelDto) {
    const l = this.level.create({ tenantId, ...(d as any) } as MemberLevel);
    return this.level.save(l as any);
  }
  async listLevels(tenantId: number) {
    return this.level.find({ where: { tenantId } as any, order: { level: 'ASC' } as any });
  }
  async updateLevel(tenantId: number, id: number, d: UpdateMemberLevelDto) {
    const l = await this.level.findOne({ where: { tenantId, id } as any });
    if (!l) throw new NotFoundException('等级不存在');
    Object.assign(l, d as any);
    return this.level.save(l as any);
  }
  async removeLevel(tenantId: number, id: number) {
    const l = await this.level.findOne({ where: { tenantId, id } as any });
    if (!l) throw new NotFoundException('等级不存在');
    await this.level.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 取或建会员（默认最低等级） */
  async ensureMember(tenantId: number, studentId: number) {
    const found = await this.member.findOne({ where: { tenantId, studentId } as any });
    if (found) return found;
    const lowest = await this.level.findOne({ where: { tenantId, status: 'ACTIVE' } as any, order: { minPoints: 'ASC' } as any });
    const created = this.member.create({
      tenantId, studentId, levelId: lowest?.id, points: 0, totalPoints: 0, status: 'NORMAL',
    } as Member);
    return this.member.save(created as any);
  }

  /** 调整积分（发放/扣减），自动升级，写流水 */
  async adjustPoints(tenantId: number, d: AdjustPointsDto) {
    const m = await this.ensureMember(tenantId, d.studentId);
    const type = d.type || (d.points >= 0 ? 'EARN' : 'REDEEM');
    if (type === 'REDEEM' && m.points < Math.abs(d.points)) {
      throw new BusinessException(ResCode.BAD_REQUEST, '积分不足');
    }
    m.points = Math.max(0, m.points + d.points);
    if (d.points > 0) m.totalPoints += d.points;
    // 升级：取累计积分满足的最高等级
    const levels = await this.level.find({ where: { tenantId, status: 'ACTIVE' } as any, order: { minPoints: 'DESC' } as any });
    const hit = levels.find((l) => m.totalPoints >= l.minPoints);
    if (hit) m.levelId = hit.id;
    await this.member.save(m as any);

    const lg = this.ledger.create({
      tenantId, memberId: m.id, studentId: m.studentId,
      type, points: d.points, refType: d.refType, refId: d.refId, remark: d.remark,
    } as PointLedger);
    await this.ledger.save(lg as any);
    return m;
  }

  async listMembers(tenantId: number, q: MemberPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.status) where.status = q.status;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.member.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async getMember(tenantId: number, studentId: number) {
    return this.ensureMember(tenantId, studentId);
  }

  async listLedger(tenantId: number, studentId: number) {
    return this.ledger.find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any });
  }
}
