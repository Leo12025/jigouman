import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { orgRepo } from '../../common/org-scope';
import { orderEvents, OrderPaidPayload } from '../../common/order-events';
import { isReturningStudent } from '../../common/student-audience';
import {
  resolveLimits, checkCompliance, assertComplianceConfirmable,
} from '../../common/compliance';
import { GroupBuyActivity } from './entities/group-buy-activity.entity';
import { GroupBuyTeam } from './entities/group-buy-team.entity';
import { GroupBuyMember } from './entities/group-buy-member.entity';
import { GroupBuyTier } from './entities/group-buy-tier.entity';
import { GroupBuyShowoff } from './entities/group-buy-showoff.entity';
import { GroupBuySquad } from './entities/group-buy-squad.entity';
import { ActivityEvent } from './entities/activity-event.entity';
import { MarketingMaterial } from './entities/marketing-material.entity';
import { Order } from '../order/entities/order.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { Distributor } from '../distribution/entities/distributor.entity';
import { Commission } from '../distribution/entities/commission.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import {
  CreateGroupBuyActivityDto, UpdateGroupBuyActivityDto, CreateTeamDto, JoinTeamDto,
  GroupBuyPageQueryDto, SetGroupBuyTiersDto, CreateShowoffDto, CreateSquadDto,
  TrackEventDto, CreateMaterialDto, RedeemDto,
} from './dto/groupbuy.dto';
import { OrderService } from '../order/order.service';

function randCode(prefix: string) {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}
function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}
function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3600_000);
}
function parseIds(raw?: string): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(Number).filter((n) => !Number.isNaN(n)) : [];
  } catch {
    return [];
  }
}

@Injectable()
export class GroupBuyService implements OnModuleInit {
  constructor(
    @InjectRepository(GroupBuyActivity) private readonly actRaw: Repository<GroupBuyActivity>,
    @InjectRepository(GroupBuyTeam) private readonly teamRaw: Repository<GroupBuyTeam>,
    @InjectRepository(GroupBuyMember) private readonly memberRaw: Repository<GroupBuyMember>,
    @InjectRepository(GroupBuyTier) private readonly tierRaw: Repository<GroupBuyTier>,
    @InjectRepository(GroupBuyShowoff) private readonly showoffRaw: Repository<GroupBuyShowoff>,
    @InjectRepository(GroupBuySquad) private readonly squadRaw: Repository<GroupBuySquad>,
    @InjectRepository(ActivityEvent) private readonly eventRaw: Repository<ActivityEvent>,
    @InjectRepository(MarketingMaterial) private readonly materialRaw: Repository<MarketingMaterial>,
    @InjectRepository(Order) private readonly orderRaw: Repository<Order>,
    @InjectRepository(HourAccount) private readonly accRaw: Repository<HourAccount>,
    @InjectRepository(Distributor) private readonly distRaw: Repository<Distributor>,
    @InjectRepository(Commission) private readonly commRaw: Repository<Commission>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly orderSvc: OrderService,
  ) {
    this.act = orgRepo(actRaw);
    this.team = orgRepo(teamRaw);
    this.member = orgRepo(memberRaw);
    this.tier = orgRepo(tierRaw);
    this.showoff = orgRepo(showoffRaw);
    this.squad = orgRepo(squadRaw);
    this.event = orgRepo(eventRaw);
    this.material = orgRepo(materialRaw);
    this.orderRepo = orgRepo(orderRaw);
    this.accRepo = orgRepo(accRaw);
    this.dist = orgRepo(distRaw);
    this.comm = orgRepo(commRaw);
  }

  private readonly act: Repository<GroupBuyActivity>;
  private readonly team: Repository<GroupBuyTeam>;
  private readonly member: Repository<GroupBuyMember>;
  private readonly tier: Repository<GroupBuyTier>;
  private readonly showoff: Repository<GroupBuyShowoff>;
  private readonly squad: Repository<GroupBuySquad>;
  private readonly event: Repository<ActivityEvent>;
  private readonly material: Repository<MarketingMaterial>;
  private readonly orderRepo: Repository<Order>;
  private readonly accRepo: Repository<HourAccount>;
  private readonly dist: Repository<Distributor>;
  private readonly comm: Repository<Commission>;

  onModuleInit() {
    // 拼团订单支付成功：若团已成团则立即发放课时（未成团则等成团后发放）
    orderEvents.on('order.paid', (p: OrderPaidPayload) => {
      void this.onOrderPaid(p.tenantId, p.orderId).catch(() => undefined);
    });
  }

  // ---------------------------------------------------------------- 活动

  private async limits(tenantId: number) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } as any });
    return resolveLimits(t?.config);
  }

  async createActivity(tenantId: number, d: CreateGroupBuyActivityDto) {
    // 合规：拼团价与发放课时同样受预收费监管上限约束（二次确认可继续）
    const limits = await this.limits(tenantId);
    assertComplianceConfirmable(
      checkCompliance(limits, { hours: d.hours, amount: d.price }),
      d.confirmCompliance,
      '拼团活动超出预收费监管上限',
    );
    const a = this.act.create({
      tenantId,
      name: d.name,
      courseId: d.courseId,
      packageId: d.packageId,
      price: d.price,
      hours: d.hours ?? 0,
      groupSize: d.groupSize || 2,
      leaderPrice: d.leaderPrice,
      teamValidHours: d.teamValidHours ?? 24,
      autoFill: d.autoFill ?? false,
      joinRule: d.joinRule || 'ALL',
      commissionRate1: d.commissionRate1 ?? 0,
      commissionRate2: d.commissionRate2 ?? 0,
      startTime: d.startTime ? new Date(d.startTime) : undefined,
      endTime: d.endTime ? new Date(d.endTime) : undefined,
      ownerId: d.ownerId,
      status: (d.status as any) || 'ACTIVE',
      remark: d.remark,
    } as GroupBuyActivity);
    return this.act.save(a as any);
  }

  async listActivities(tenantId: number, q: GroupBuyPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.act.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async getActivity(tenantId: number, id: number) {
    const a = await this.act.findOne({ where: { tenantId, id } as any });
    if (!a) throw new BusinessException(ResCode.BAD_REQUEST, '活动不存在');
    return a;
  }

  async updateActivity(tenantId: number, id: number, d: UpdateGroupBuyActivityDto) {
    const a = await this.getActivity(tenantId, id);
    const nextHours = d.hours ?? a.hours;
    const nextPrice = d.price ?? a.price;
    const limits = await this.limits(tenantId);
    assertComplianceConfirmable(
      checkCompliance(limits, { hours: nextHours, amount: nextPrice }),
      (d as any).confirmCompliance,
      '拼团活动超出预收费监管上限',
    );
    Object.assign(a, {
      ...(d as any),
      startTime: d.startTime ? new Date(d.startTime) : a.startTime,
      endTime: d.endTime ? new Date(d.endTime) : a.endTime,
    });
    return this.act.save(a as any);
  }

  async removeActivity(tenantId: number, id: number) {
    await this.getActivity(tenantId, id);
    await this.act.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 活动时间校验：此前 startTime/endTime 是死配置，从不校验 */
  private assertActivityTime(a: GroupBuyActivity) {
    if (a.status !== 'ACTIVE') throw new BusinessException(ResCode.BAD_REQUEST, '活动未启用');
    const now = Date.now();
    if (a.startTime && new Date(a.startTime).getTime() > now) {
      throw new BusinessException(ResCode.BAD_REQUEST, '活动未开始');
    }
    if (a.endTime && new Date(a.endTime).getTime() < now) {
      throw new BusinessException(ResCode.BAD_REQUEST, '活动已结束');
    }
  }

  // ---------------------------------------------------------------- 阶梯团

  async setTiers(tenantId: number, activityId: number, d: SetGroupBuyTiersDto) {
    const a = await this.getActivity(tenantId, activityId);
    const limits = await this.limits(tenantId);
    await this.tier.delete({ tenantId, activityId } as any);
    const out: GroupBuyTier[] = [];
    let i = 0;
    for (const t of d.tiers || []) {
      assertComplianceConfirmable(
        checkCompliance(limits, { amount: t.price }),
        (d as any).confirmCompliance,
        `拼团阶梯(${t.minSize}人)超出监管上限`,
      );
      out.push(
        (await this.tier.save(
          this.tier.create({
            tenantId, activityId, minSize: t.minSize, price: t.price, sort: t.sort ?? i,
          } as GroupBuyTier) as any,
        )) as GroupBuyTier,
      );
      i += 1;
    }
    return out;
  }

  async listTiers(tenantId: number, activityId: number) {
    return this.tier.find({
      where: { tenantId, activityId } as any, order: { sort: 'ASC' } as any,
    });
  }

  /** 成团价：团长优惠价 > 阶梯价 > 活动价 */
  private async priceFor(a: GroupBuyActivity, size: number, isLeader: boolean): Promise<number> {
    if (isLeader && a.leaderPrice != null) return Number(a.leaderPrice);
    const tiers = await this.tier.find({
      where: { tenantId: a.tenantId, activityId: a.id } as any, order: { sort: 'ASC' } as any,
    });
    if (tiers.length) {
      let price = Number(a.price);
      for (const t of tiers) if (size >= Number(t.minSize)) price = Number(t.price);
      return price;
    }
    return Number(a.price);
  }

  // ---------------------------------------------------------------- 开团 / 参团（交易闭环）

  /** 参团即生成订单（待支付）；成团后凭已支付订单发放课时 */
  private async createMemberOrder(
    tenantId: number,
    a: GroupBuyActivity,
    teamId: number,
    studentId: number,
    price: number,
  ) {
    const order: any = await this.orderSvc.createOrder(tenantId, {
      studentId,
      remark: `拼团：${a.name}`,
      items: [
        {
          courseId: a.courseId ?? 0,
          itemType: a.packageId ? 'HOUR_PACK' : 'COURSE',
          packageId: a.packageId,
          name: `拼团：${a.name}`,
          qty: 1,
          unitPrice: price,
          hours: Number(a.hours) || 0,
        },
      ],
    } as any);
    // 标记为拼团订单：payOrder 会据此延迟发放课时
    await this.orderRaw
      .createQueryBuilder()
      .update(Order)
      .set({ groupBuyTeamId: teamId })
      .where('id = :id', { id: order.id })
      .execute();
    return order;
  }

  async createTeam(tenantId: number, d: CreateTeamDto) {
    const a = await this.getActivity(tenantId, d.activityId);
    this.assertActivityTime(a);
    const code = randCode('GB');
    const t = (await this.team.save(
      this.team.create({
        tenantId,
        activityId: d.activityId,
        code,
        leaderStudentId: d.leaderStudentId,
        currentSize: 1,
        status: 'OPEN',
        expireAt: addHours(new Date(), Number(a.teamValidHours) || 24),
      } as GroupBuyTeam) as any,
    )) as GroupBuyTeam;

    const leaderPrice = await this.priceFor(a, 1, true);
    const m = (await this.member.save(
      this.member.create({
        tenantId, teamId: t.id, studentId: d.leaderStudentId,
        distributorId: d.distributorId, isLeader: true, payPrice: leaderPrice,
      } as GroupBuyMember) as any,
    )) as GroupBuyMember;
    const order = await this.createMemberOrder(tenantId, a, t.id, d.leaderStudentId, leaderPrice);
    await this.member.update({ tenantId, id: m.id } as any, { orderId: order.id } as any);

    await this.track(tenantId, a.id, 'TEAM_OPEN', {
      teamId: t.id, studentId: d.leaderStudentId, staffId: d.staffId,
    });
    return { team: t, order };
  }

  async joinTeam(tenantId: number, d: JoinTeamDto) {
    const t = await this.team.findOne({ where: { tenantId, code: d.code } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    if (t.status !== 'OPEN') throw new BusinessException(ResCode.BAD_REQUEST, '拼团已结束');
    const a = await this.getActivity(tenantId, t.activityId);
    this.assertActivityTime(a);

    // 团有效期：过期即失效并退已支付订单
    if (t.expireAt && new Date(t.expireAt).getTime() <= Date.now()) {
      await this.invalidateTeam(tenantId, t, a, '拼团已过期未成团');
      throw new BusinessException(ResCode.BAD_REQUEST, '该团已过期，请参与其他团');
    }

    // 新老客限制：老学员（有有效订单）不可参团，只能自行开团
    if (a.joinRule === 'NEW_ONLY') {
      const returning = await this.isReturning(tenantId, d.studentId);
      if (returning) {
        throw new BusinessException(
          ResCode.BAD_REQUEST,
          '该活动仅新学员可参团（老学员可另行开团享受团长优惠）',
        );
      }
    }

    const dup = await this.member.findOne({
      where: { tenantId, teamId: t.id, studentId: d.studentId } as any,
    });
    if (dup) throw new BusinessException(ResCode.BAD_REQUEST, '不可重复参团');

    // 原子占位：条件更新保证并发下不会超员
    const res = await this.teamRaw
      .createQueryBuilder()
      .update(GroupBuyTeam)
      .set({ currentSize: () => 'current_size + 1' })
      .where('id = :id', { id: t.id })
      .andWhere("status = 'OPEN'")
      .andWhere('current_size < :gs', { gs: a.groupSize })
      .execute();
    if (!(res.affected || 0)) {
      throw new BusinessException(ResCode.BAD_REQUEST, '拼团已满或已结束，请参与其他团');
    }

    const price = await this.priceFor(a, a.groupSize, false);
    const m = (await this.member.save(
      this.member.create({
        tenantId, teamId: t.id, studentId: d.studentId,
        distributorId: d.distributorId, isLeader: false, payPrice: price,
      } as GroupBuyMember) as any,
    )) as GroupBuyMember;
    const order = await this.createMemberOrder(tenantId, a, t.id, d.studentId, price);
    await this.member.update({ tenantId, id: m.id } as any, { orderId: order.id } as any);

    await this.track(tenantId, a.id, 'JOIN', {
      teamId: t.id, studentId: d.studentId, staffId: d.staffId, visitorId: d.visitorId,
    });

    const fresh = await this.team.findOne({ where: { tenantId, id: t.id } as any });
    if (fresh && fresh.currentSize >= a.groupSize) {
      await this.succeedTeam(tenantId, fresh, a, false);
    }
    return { team: fresh, order };
  }

  /** 成团：重算成员价 → 已支付订单发放课时 → 分销佣金入账 */
  private async succeedTeam(tenantId: number, t: GroupBuyTeam, a: GroupBuyActivity, auto: boolean) {
    if (t.status !== 'OPEN') return;
    await this.team.update({ tenantId, id: t.id } as any, {
      status: 'SUCCESS', successAt: new Date(), autoFilled: auto,
    } as any);

    // 阶梯团：按最终人数重算非团长成员的应付价
    const finalPrice = await this.priceFor(a, t.currentSize, false);
    const members = await this.member.find({ where: { tenantId, teamId: t.id } as any });
    for (const m of members) {
      if (!m.isLeader && Number(m.payPrice) !== finalPrice) {
        await this.member.update({ tenantId, id: m.id } as any, { payPrice: finalPrice } as any);
      }
      // 已支付订单才发课时（未支付等支付后由事件触发）
      if (m.orderId) {
        await this.orderSvc.grantOrderItems(tenantId, Number(m.orderId)).catch(() => undefined);
      }
      await this.settleCommission(tenantId, a, m);
    }
    await this.track(tenantId, a.id, 'TEAM_SUCCESS', { teamId: t.id });
  }

  /** 团失效：已支付订单自动发起退款 */
  private async invalidateTeam(
    tenantId: number,
    t: GroupBuyTeam,
    a: GroupBuyActivity | null,
    reason: string,
  ) {
    if (t.status !== 'OPEN') return;
    await this.team.update({ tenantId, id: t.id } as any, { status: 'INVALID' } as any);
    const members = await this.member.find({ where: { tenantId, teamId: t.id } as any });
    for (const m of members) {
      if (!m.orderId) continue;
      await this.orderSvc
        .refundForGroupBuy(tenantId, Number(m.orderId), reason, a?.ownerId)
        .catch(() => undefined);
    }
  }

  /** 拼团订单支付成功：团已成团则发放课时 */
  async onOrderPaid(tenantId: number, orderId: number) {
    const o = await this.orderRepo.findOne({ where: { tenantId, id: orderId } as any });
    if (!o || !o.groupBuyTeamId) return;
    const t = await this.team.findOne({ where: { tenantId, id: o.groupBuyTeamId } as any });
    if (!t || t.status !== 'SUCCESS') return;
    await this.orderSvc.grantOrderItems(tenantId, orderId).catch(() => undefined);
  }

  /** 老生判定：存在有效订单（已支付/已完成）即为老生 */
  private async isReturning(tenantId: number, studentId: number): Promise<boolean> {
    return isReturningStudent(this.orderRaw, tenantId, studentId);
  }

  /** 拼团 × 分销：成团后按一/二级比例自动入账佣金 */
  private async settleCommission(tenantId: number, a: GroupBuyActivity, m: GroupBuyMember) {
    const rate1 = Number(a.commissionRate1) || 0;
    const rate2 = Number(a.commissionRate2) || 0;
    if (!m.distributorId || (rate1 <= 0 && rate2 <= 0)) return;
    const base = Number(m.payPrice ?? a.price) || 0;
    const d1 = await this.dist.findOne({ where: { tenantId, id: m.distributorId } as any });
    if (!d1) return;
    if (rate1 > 0) {
      await this.comm.save(
        this.comm.create({
          tenantId, distributorId: d1.id, orderId: m.orderId,
          amount: r2(base * rate1), status: 'PENDING', remark: '拼团一级佣金',
        } as Commission) as any,
      );
    }
    if (rate2 > 0 && d1.parentId) {
      await this.comm.save(
        this.comm.create({
          tenantId, distributorId: d1.parentId, orderId: m.orderId,
          amount: r2(base * rate2), status: 'PENDING', remark: '拼团二级佣金',
        } as Commission) as any,
      );
    }
  }

  // ---------------------------------------------------------------- 凑团 / 查询

  /** 凑团列表：展示未成团且未过期的团 + 还差几人，按差额升序（越接近成团越靠前） */
  async listOpenTeams(tenantId: number, activityId: number, limit = 10) {
    const a = await this.getActivity(tenantId, activityId);
    const teams = await this.team.find({
      where: { tenantId, activityId, status: 'OPEN' } as any,
      order: { id: 'DESC' } as any,
      take: limit,
    });
    const now = Date.now();
    return teams
      .filter((t) => !t.expireAt || new Date(t.expireAt).getTime() > now)
      .map((t) => ({
        teamId: t.id,
        code: t.code,
        leaderStudentId: t.leaderStudentId,
        currentSize: t.currentSize,
        need: Math.max(0, Number(a.groupSize) - t.currentSize),
        expireAt: t.expireAt,
      }))
      .sort((x, y) => x.need - y.need);
  }

  async listTeams(tenantId: number, activityId: number) {
    return this.team.find({
      where: { tenantId, activityId } as any, order: { id: 'DESC' } as any,
    });
  }

  async listMembers(tenantId: number, teamId: number) {
    return this.member.find({ where: { tenantId, teamId } as any, order: { id: 'ASC' } as any });
  }

  // ---------------------------------------------------------------- 核销（落库防重复）

  async redeem(tenantId: number, d: RedeemDto, operatorId?: number) {
    const t = await this.team.findOne({ where: { tenantId, code: d.code } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    if (t.status !== 'SUCCESS') {
      throw new BusinessException(ResCode.BAD_REQUEST, '未成团或已核销，不可核销');
    }
    if (t.redeemedAt) throw new BusinessException(ResCode.BAD_REQUEST, '该团已核销，不可重复核销');
    const at = new Date();
    await this.team.update({ tenantId, id: t.id } as any, {
      status: 'REDEEMED', redeemedAt: at, redeemedBy: operatorId,
    } as any);
    await this.track(tenantId, t.activityId, 'REDEEM', { teamId: t.id });
    return { code: t.code, status: 'REDEEMED', redeemedAt: at, redeemedBy: operatorId ?? null };
  }

  // ---------------------------------------------------------------- 定时任务：团过期 / 模拟成团

  @Cron(CronExpression.EVERY_HOUR)
  async handleTeamExpireCron() {
    const rows = await this.teamRaw
      .createQueryBuilder('t')
      .select('DISTINCT t.tenant_id', 'tenantId')
      .getRawMany();
    for (const r of rows) {
      await this.expireTenant(Number(r.tenantId)).catch(() => undefined);
    }
  }

  /** 团到期：开启模拟成团则自动补足成团，否则失效并退已支付订单 */
  async expireTenant(tenantId: number) {
    // 条件下推到 SQL：只取已过期的团，避免全表加载所有 OPEN 团后 JS 过滤
    const teams = await this.team.find({
      where: { tenantId, status: 'OPEN', expireAt: LessThanOrEqual(new Date()) } as any,
    });
    let expired = 0;
    let filled = 0;
    for (const t of teams) {
      const a = await this.act.findOne({ where: { tenantId, id: t.activityId } as any });
      if (a && a.autoFill) {
        await this.succeedTeam(tenantId, t, a, true);
        filled += 1;
      } else {
        await this.invalidateTeam(tenantId, t, a, '拼团未成团');
        expired += 1;
      }
    }
    return { expired, autoFilled: filled };
  }

  // ---------------------------------------------------------------- P2：晒单 / 物料 / 战队 / 埋点

  async createShowoff(tenantId: number, d: CreateShowoffDto) {
    const t = await this.team.findOne({ where: { tenantId, id: d.teamId } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    return this.showoff.save(
      this.showoff.create({
        tenantId, activityId: t.activityId, teamId: d.teamId,
        studentId: d.studentId, images: d.images, content: d.content,
        status: 'APPROVED',
      } as GroupBuyShowoff) as any,
    );
  }

  async listShowoffs(tenantId: number, activityId?: number, teamId?: number) {
    const where: any = { tenantId };
    if (activityId) where.activityId = activityId;
    if (teamId) where.teamId = teamId;
    return this.showoff.find({ where, order: { id: 'DESC' } as any, take: 50 });
  }

  async createSquad(tenantId: number, d: CreateSquadDto) {
    return this.squad.save(
      this.squad.create({
        tenantId, name: d.name, activityId: d.activityId, staffIds: d.staffIds, status: 'ACTIVE',
      } as GroupBuySquad) as any,
    );
  }

  async listSquads(tenantId: number, activityId?: number) {
    const where: any = { tenantId };
    if (activityId) where.activityId = activityId;
    return this.squad.find({ where, order: { id: 'DESC' } as any });
  }

  /** 过程埋点上报：未授权访客也可留痕（visitorId） */
  async track(
    tenantId: number,
    activityId: number,
    type: ActivityEvent['type'],
    extra?: { teamId?: number; studentId?: number; visitorId?: string; staffId?: number },
  ) {
    return this.event.save(
      this.event.create({
        tenantId, activityId, type,
        teamId: extra?.teamId, studentId: extra?.studentId,
        visitorId: extra?.visitorId, staffId: extra?.staffId,
      } as ActivityEvent) as any,
    );
  }

  async trackPublic(tenantId: number, d: TrackEventDto) {
    return this.track(tenantId, d.activityId, d.type, {
      teamId: d.teamId, studentId: d.studentId, visitorId: d.visitorId, staffId: d.staffId,
    });
  }

  /** 活动转化漏斗：访问 → 分享 → 参团 → 成团 → 核销 */
  async funnel(tenantId: number, activityId: number) {
    const events = await this.event.find({ where: { tenantId, activityId } as any });
    const count = (t: string) => events.filter((e) => e.type === t).length;
    const view = count('VIEW');
    const share = count('SHARE');
    const join = count('JOIN');
    const teamSuccess = count('TEAM_SUCCESS');
    const redeem = count('REDEEM');
    return {
      activityId, view, share, join, teamSuccess, redeem,
      rates: {
        viewToJoin: view ? Number(((join / view) * 100).toFixed(2)) : 0,
        joinToSuccess: join ? Number(((teamSuccess / join) * 100).toFixed(2)) : 0,
      },
    };
  }

  /** 员工榜：按成团数 + 参团数排名（战队 PK 的数据底座） */
  async staffRanking(tenantId: number, activityId?: number) {
    const where: any = { tenantId };
    if (activityId) where.activityId = activityId;
    const events = await this.event.find({ where });
    const squads = await this.squad.find({ where: { tenantId } as any });
    const staffToSquad = new Map<number, string>();
    squads.forEach((s) => parseIds(s.staffIds).forEach((id) => staffToSquad.set(id, s.name)));

    const map = new Map<number, { staffId: number; squad?: string; teams: number; joins: number }>();
    for (const e of events) {
      if (!e.staffId) continue;
      const cur = map.get(e.staffId) || {
        staffId: e.staffId, squad: staffToSquad.get(e.staffId), teams: 0, joins: 0,
      };
      if (e.type === 'TEAM_SUCCESS') cur.teams += 1;
      if (e.type === 'JOIN' || e.type === 'TEAM_OPEN') cur.joins += 1;
      map.set(e.staffId, cur);
    }
    return [...map.values()].sort((a, b) => b.teams - a.teams || b.joins - a.joins);
  }

  /** 营销物料：轻量模板库（海报/传单/图文/邀请函） */
  async createMaterial(tenantId: number, d: CreateMaterialDto) {
    return this.material.save(
      this.material.create({
        tenantId, name: d.name, type: d.type || 'POSTER', scene: d.scene,
        activityId: d.activityId, content: d.content, coverUrl: d.coverUrl,
        printable: d.printable ?? false, status: 'ACTIVE',
      } as MarketingMaterial) as any,
    );
  }

  async listMaterials(tenantId: number, scene?: string, type?: string) {
    const where: any = { tenantId, status: 'ACTIVE' };
    if (scene) where.scene = scene;
    if (type) where.type = type;
    return this.material.find({ where, order: { id: 'DESC' } as any });
  }
}
