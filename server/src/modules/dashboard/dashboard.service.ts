import { orgRepo as orgScoped, resolveOrgFilter } from '../../common/org-scope';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MetricDef } from './entities/metric-def.entity';
import { Lead, LeadStage } from '../lead/entities/lead.entity';
import { Student, StudentStatus } from '../student/entities/student.entity';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { HourConsumption } from '../hour/entities/hour-consumption.entity';
import { Attendance } from '../hour/entities/attendance.entity';
import { ClassGroup } from '../course/entities/class-group.entity';
import { Homework } from '../homework/entities/homework.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';
import { HomeworkReview } from '../homework/entities/homework-review.entity';
import { Task, TaskStatus } from '../task/entities/task.entity';
import { CourseReview } from '../family/entities/course-review.entity';
import { Organization } from '../org/entities/organization.entity';
import { CostRecord } from '../cost/entities/cost-record.entity';
import { Material } from '../inventory/entities/material.entity';
import { Channel } from '../lead/entities/channel.entity';
import { Campaign } from '../lead/entities/campaign.entity';
import { DashboardRole, DASHBOARD_ROLES } from './dto/dashboard.dto';
import { buildCsv, buildPdf, ExportColumn, ExportFile } from './export.util';

/**
 * 数据经营分析（M6，文档 §4.10 / §6.7）。
 * 只读聚合：基于已有多模块数据计算经营/招生/教学看板指标。
 * 聚合在 JS 层完成（与 §4.2 漏斗一致），规避 MySQL/SQLite 的 datetime/日期方言差异。
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(StudentCourse) private scRepo: Repository<StudentCourse>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(HourAccount) private haRepo: Repository<HourAccount>,
    @InjectRepository(HourConsumption) private hcRepo: Repository<HourConsumption>,
    @InjectRepository(Attendance) private attRepo: Repository<Attendance>,
    @InjectRepository(ClassGroup) private cgRepo: Repository<ClassGroup>,
    @InjectRepository(Homework) private hwRepo: Repository<Homework>,
    @InjectRepository(HomeworkSubmit) private hsRepo: Repository<HomeworkSubmit>,
    @InjectRepository(HomeworkReview) private hrRepo: Repository<HomeworkReview>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(CourseReview) private reviewRepo: Repository<CourseReview>,
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
    @InjectRepository(MetricDef) private metricRepo: Repository<MetricDef>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(CostRecord) private costRepo: Repository<CostRecord>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectDataSource() private ds: DataSource,
  ) {
    // 看板按校区口径聚合：套用校区隔离（读自动过滤 org_id）
    // 注意：本类已有字段 orgRepo(Organization 仓库)，故用别名引入隔离助手
    this.leadRepo = orgScoped(this.leadRepo);
    this.studentRepo = orgScoped(this.studentRepo);
    this.scRepo = orgScoped(this.scRepo);
    this.orderRepo = orgScoped(this.orderRepo);
    this.haRepo = orgScoped(this.haRepo);
    this.hcRepo = orgScoped(this.hcRepo);
    this.attRepo = orgScoped(this.attRepo);
    this.cgRepo = orgScoped(this.cgRepo);
    this.hwRepo = orgScoped(this.hwRepo);
    this.hsRepo = orgScoped(this.hsRepo);
    this.hrRepo = orgScoped(this.hrRepo);
    this.taskRepo = orgScoped(this.taskRepo);
    this.reviewRepo = orgScoped(this.reviewRepo);
    this.channelRepo = orgScoped(this.channelRepo);
    this.campaignRepo = orgScoped(this.campaignRepo);
    this.costRepo = orgScoped(this.costRepo);
    this.materialRepo = orgScoped(this.materialRepo);
  }

  async byRole(t: number, role: string, q: any) {
    if (!DASHBOARD_ROLES.includes(role as DashboardRole)) {
      throw new BadRequestException(`role 必须为 ${DASHBOARD_ROLES.join(' | ')}`);
    }
    const months = Number(q?.months) || 6;
    let base: any;
    switch (role) {
      case 'principal':
        base = await this.principal(t, q, months);
        break;
      case 'admission':
        base = await this.admission(t, q);
        break;
      case 'teaching':
        base = await this.teaching(t);
        break;
      default:
        throw new BadRequestException('unknown role');
    }
    base.dynamicMetrics = await this.dynamicMetricsFor(t, role);
    return base;
  }

  /** 数据大屏总览：聚合经营/招生/教学核心指标 + 趋势 + 漏斗 + 预警（供独立全屏大屏调用） */
  async screenOverview(t: number) {
    const p = await this.byRole(t, 'principal', {});
    const a = await this.byRole(t, 'admission', {});
    const te = await this.byRole(t, 'teaching', {});
    return {
      kpis: {
        receivable: this.num(p.revenue?.receivable),
        received: this.num(p.revenue?.received),
        refund: this.num(p.revenue?.refundAmount),
        netCashflow: this.num(p.revenue?.netCashflow),
        studying: this.num(p.students?.studying),
        refunded: this.num(p.students?.refunded),
        consumeRate: this.num(p.hours?.consumeRate),
        fullRate: this.num(p.classGroups?.fullRate),
        conversionRate: this.num(a.funnel?.conversionRate),
        leads: this.num(a.funnel?.total),
        signed: this.num(a.funnel?.signed),
        attendanceRate: this.num(te.attendance?.attendanceRate),
        reviewedRate: this.num(te.homework?.reviewedRate),
      },
      trend: p.trend || [],
      funnel: a.funnel || {},
      byChannel: a.byChannel || [],
      classGroups: p.classGroups || {},
      alerts: te.alerts || [],
      dynamicMetrics: p.dynamicMetrics || [],
    };
  }

  private num(v: any): number {
    return typeof v === 'number' ? v : Number(v || 0);
  }

  // ---------------- SQL 聚合助手 ----------------
  /**
   * 校区隔离条件。注意：orgRepo 代理只对 find/findOne/findAndCount/count 等方法注入过滤，
   * createQueryBuilder 会直接透传，因此这里必须手动补上，否则看板会跨校区泄漏。
   */
  private scopeOf(repo: Repository<any>): { sql?: string; params?: any } {
    const f = resolveOrgFilter(repo) as any;
    if (!f) return {};
    const v = f.orgId;
    if (v == null) return {};
    const arr = v && typeof v === 'object' ? (v.value ?? v._value) : v;
    if (Array.isArray(arr)) {
      return arr.length ? { sql: 'e.org_id IN (:...orgIds)', params: { orgIds: arr } } : { sql: '1 = 0' };
    }
    return { sql: 'e.org_id = :orgId', params: { orgId: v } };
  }

  private applyScope(qb: any, repo: Repository<any>, extra?: { sql?: string; params?: any }) {
    const s = this.scopeOf(repo);
    if (s.sql) qb.andWhere(s.sql, s.params || {});
    if (extra?.sql) qb.andWhere(extra.sql, extra.params || {});
  }

  /**
   * 单值聚合（COUNT/SUM）：只回传标量。
   * 相比 find({where:{tenantId}}) 全表加载，内存从 O(表行数) 降到 O(1)。
   * 注意手动补 deleted_at IS NULL：QueryBuilder 不会像 find 那样自动排除软删除行。
   */
  private async scalar(
    repo: Repository<any>,
    select: string,
    t: number,
    extra?: { sql?: string; params?: any },
  ): Promise<number> {
    const qb = repo
      .createQueryBuilder('e')
      .select(select, 'v')
      .where('e.tenant_id = :t', { t })
      .andWhere('e.deleted_at IS NULL');
    this.applyScope(qb, repo, extra);
    const raw = await qb.getRawOne();
    return Number(raw?.v || 0);
  }

  /** 分组聚合：每组一行，内存 O(分组数)。支持单/多分组表达式 */
  private async grouped(
    repo: Repository<any>,
    groupExpr: string | string[],
    selects: string[],
    t: number,
    extra?: { sql?: string; params?: any },
  ): Promise<any[]> {
    const exprs = Array.isArray(groupExpr) ? groupExpr : [groupExpr];
    const qb = repo
      .createQueryBuilder('e')
      .where('e.tenant_id = :t', { t })
      .andWhere('e.deleted_at IS NULL');
    exprs.forEach((g, i) => qb.addSelect(g, exprs.length === 1 ? 'k' : `k${i}`));
    for (const s of selects) qb.addSelect(s);
    this.applyScope(qb, repo, extra);
    qb.groupBy(exprs.join(', '));
    return (await qb.getRawMany()) || [];
  }

  /** 月份表达式：MySQL 与 SQLite 方言不同，按驱动分支 */
  private monthExpr(alias = 'e'): string {
    const type = (this.ds.options as any).type;
    return type === 'mysql'
      ? `DATE_FORMAT(${alias}.created_at, '%Y-%m')`
      : `strftime('%Y-%m', ${alias}.created_at)`;
  }

  private dateRange(start?: string, end?: string): { sql?: string; params?: any } {
    if (!start && !end) return {};
    const parts: string[] = [];
    const params: any = {};
    if (start) { parts.push('e.created_at >= :dStart'); params.dStart = new Date(start); }
    if (end) { parts.push('e.created_at <= :dEnd'); params.dEnd = new Date(end); }
    return { sql: parts.join(' AND '), params };
  }

  // ---------------- 动态指标配置（§4.10 看板增强） ----------------
  async createMetricDef(t: number, d: any) {
    const m = this.metricRepo.create({ tenantId: t, ...d } as MetricDef);
    return this.metricRepo.save(m as any);
  }

  async listMetricDefs(t: number, category?: string) {
    const where: any = { tenantId: t };
    if (category) where.category = category;
    const list = await this.metricRepo.find({ where, order: { sort: 'ASC', id: 'ASC' } as any });
    return { list };
  }

  async updateMetricDef(t: number, id: number, d: any) {
    const m = await this.metricRepo.findOne({ where: { tenantId: t, id } as any });
    if (!m) throw new NotFoundException('指标定义不存在');
    Object.assign(m, d);
    return this.metricRepo.save(m as any);
  }

  async removeMetricDef(t: number, id: number) {
    const m = await this.metricRepo.findOne({ where: { tenantId: t, id } as any });
    if (!m) throw new NotFoundException('指标定义不存在');
    await this.metricRepo.delete({ tenantId: t, id } as any);
    return { id };
  }

  /** 按角色分类（含 common）取已启用指标，并计算当前值 */
  private async dynamicMetricsFor(t: number, role: DashboardRole) {
    const defs = await this.metricRepo.find({
      where: { tenantId: t, enabled: true, category: (role as any) } as any,
    });
    const out: any[] = [];
    for (const def of defs) {
      const value = await this.computeMetric(def.code, t);
      out.push({ code: def.code, name: def.name, unit: def.unit || '', value });
    }
    return out;
  }

  /** 内置指标注册表：code -> 计算函数（全部下推 SQL 聚合，不再全表加载实体） */
  private async computeMetric(code: string, t: number): Promise<number | null> {
    const cnt = (repo: Repository<any>, where?: string) =>
      this.scalar(repo, 'COUNT(*)', t, where ? { sql: where } : undefined);
    const sum = (repo: Repository<any>, field: string, where?: string) =>
      this.scalar(repo, `COALESCE(SUM(e.${field}),0)`, t, where ? { sql: where } : undefined);

    switch (code) {
      case 'REVENUE_RECEIVED':
        return sum(this.orderRepo, 'paidAmount', `e.status IN ('${OrderStatus.PAID}','${OrderStatus.COMPLETED}')`);
      case 'REVENUE_RECEIVABLE':
        return sum(this.orderRepo, 'payableAmount');
      case 'REFUND_AMOUNT':
        return sum(this.orderRepo, 'payableAmount', `e.status = '${OrderStatus.REFUNDED}'`);
      case 'TOTAL_STUDENTS':
        return cnt(this.studentRepo);
      case 'STUDYING_STUDENTS':
        return cnt(this.studentRepo, `e.status = '${StudentStatus.STUDYING}'`);
      case 'REFUNDED_STUDENTS':
        return cnt(this.studentRepo, `e.status = '${StudentStatus.REFUNDED}'`);
      case 'CONSUME_RATE': {
        const granted = await sum(this.hcRepo, 'hours', "e.type = 'GRANT'");
        const consumed = -(await sum(this.hcRepo, 'hours', "e.type = 'CONSUME'"));
        return granted ? Number((consumed / granted).toFixed(4)) : 0;
      }
      case 'FULL_RATE': {
        const cap = await sum(this.cgRepo, 'capacity');
        const enrolled = await cnt(this.scRepo, "e.status = 'ACTIVE'");
        return cap ? Number((enrolled / cap).toFixed(4)) : 0;
      }
      case 'ATTENDANCE_RATE': {
        const total = await cnt(this.attRepo);
        if (!total) return 0;
        const present = await cnt(this.attRepo, "e.status = 'PRESENT'");
        return Number((present / total).toFixed(4));
      }
      case 'TRIAL_CONVERSION': {
        const total = await cnt(this.leadRepo);
        if (!total) return 0;
        const signed = await cnt(this.leadRepo, `e.stage = '${LeadStage.SIGNED}'`);
        return Number((signed / total).toFixed(4));
      }
      case 'TOTAL_LEADS':
        return cnt(this.leadRepo);
      case 'PENDING_HOMEWORK':
        return cnt(this.hsRepo, "e.status = 'SUBMITTED'");
      case 'PENDING_REVIEW':
        return cnt(this.taskRepo, `e.status = '${TaskStatus.TODO}'`);
      case 'PENDING_COURSE_REVIEW':
        return cnt(
          this.taskRepo,
          `e.status = '${TaskStatus.TODO}' AND e.type = 'AFTER_CLASS_REVIEW'`,
        );
      default:
        return null;
    }
  }

  /** 导出全部内置指标当前值快照（供预警规则评估联动，§4.10/§6.7） */
  async snapshotMetrics(t: number): Promise<Record<string, number>> {
    const codes = [
      'REVENUE_RECEIVED',
      'REVENUE_RECEIVABLE',
      'REFUND_AMOUNT',
      'TOTAL_STUDENTS',
      'STUDYING_STUDENTS',
      'REFUNDED_STUDENTS',
      'CONSUME_RATE',
      'FULL_RATE',
      'ATTENDANCE_RATE',
      'TRIAL_CONVERSION',
      'TOTAL_LEADS',
      'PENDING_HOMEWORK',
      'PENDING_REVIEW',
      'PENDING_COURSE_REVIEW',
    ];
    const out: Record<string, number> = {};
    for (const c of codes) out[c] = (await this.computeMetric(c, t)) ?? 0;
    return out;
  }

  /** 合并日期范围条件与额外条件 */
  private mergeWhere(
    a?: { sql?: string; params?: any },
    b?: string,
    extraParams?: any,
  ): { sql?: string; params?: any } {
    if (!b) return a || {};
    const sql = a?.sql ? `${a.sql} AND ${b}` : b;
    return { sql, params: { ...(a?.params || {}), ...(extraParams || {}) } };
  }

  /** 月度趋势（按月份分组聚合，O(月份数) 内存） */
  private async monthTrendAgg(t: number, months: number, dr: { sql?: string; params?: any }) {
    const mExpr = this.monthExpr();
    const [ordRows, hcRows] = await Promise.all([
      this.grouped(
        this.orderRepo, mExpr,
        ['COALESCE(SUM(e.payable_amount),0) AS receivable', 'COALESCE(SUM(e.paid_amount),0) AS received'],
        t, dr,
      ),
      this.grouped(
        this.hcRepo, mExpr, ['COALESCE(SUM(e.hours),0) AS hours'],
        t, this.mergeWhere(dr, "e.type = 'CONSUME'"),
      ),
    ]);
    const ordMap = new Map<string, any>(ordRows.map((r) => [String(r.k), r]));
    const hcMap = new Map<string, any>(hcRows.map((r) => [String(r.k), r]));
    const arr: any[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const o = ordMap.get(ym);
      const c = hcMap.get(ym);
      arr.push({
        month: ym,
        receivable: Number(o?.receivable || 0),
        received: Number(o?.received || 0),
        consumed: -Number(c?.hours || 0),
      });
    }
    return arr;
  }

  // ---------------- 经营看板（校长视角） ----------------
  private async principal(t: number, q: any, months: number) {
    const dr = this.dateRange(q?.start, q?.end);
    const paidCond = `e.status IN ('${OrderStatus.PAID}','${OrderStatus.COMPLETED}')`;
    const refundCond = `e.status = '${OrderStatus.REFUNDED}'`;

    const [
      orderCount, paidOrderCount, receivable, received, refundAmount,
      totalStudents, studying, refundedStu,
      granted, consumedAbs, balance, capacity, enrolled, cgCount,
    ] = await Promise.all([
      this.scalar(this.orderRepo, 'COUNT(*)', t, dr),
      this.scalar(this.orderRepo, 'COUNT(*)', t, this.mergeWhere(dr, paidCond)),
      this.scalar(this.orderRepo, 'COALESCE(SUM(e.payable_amount),0)', t, dr),
      this.scalar(this.orderRepo, 'COALESCE(SUM(e.paid_amount),0)', t, dr),
      this.scalar(this.orderRepo, 'COALESCE(SUM(e.payable_amount),0)', t, this.mergeWhere(dr, refundCond)),
      this.scalar(this.studentRepo, 'COUNT(*)', t),
      this.scalar(this.studentRepo, 'COUNT(*)', t, { sql: `e.status = '${StudentStatus.STUDYING}'` }),
      this.scalar(this.studentRepo, 'COUNT(*)', t, { sql: `e.status = '${StudentStatus.REFUNDED}'` }),
      this.scalar(this.hcRepo, 'COALESCE(SUM(e.hours),0)', t, { sql: "e.type = 'GRANT'" }),
      this.scalar(this.hcRepo, 'COALESCE(SUM(e.hours),0)', t, { sql: "e.type = 'CONSUME'" }),
      this.scalar(this.haRepo, 'COALESCE(SUM(e.balance),0)', t),
      this.scalar(this.cgRepo, 'COALESCE(SUM(e.capacity),0)', t),
      this.scalar(this.scRepo, 'COUNT(*)', t, { sql: "e.status = 'ACTIVE'" }),
      this.scalar(this.cgRepo, 'COUNT(*)', t),
    ]);

    const consumed = -consumedAbs;
    const consumeRate = granted ? Number((consumed / granted).toFixed(4)) : 0;
    const fullRate = capacity ? Number((enrolled / capacity).toFixed(4)) : 0;

    // 招生漏斗（按阶段分组）
    const stageRows = await this.grouped(this.leadRepo, 'e.stage', ['COUNT(*) AS c'], t, dr);
    const byStage: Record<string, number> = {};
    for (const s of Object.values(LeadStage)) byStage[s] = 0;
    for (const r of stageRows) byStage[String(r.k)] = Number(r.c);
    const leadTotal = stageRows.reduce((a, r) => a + Number(r.c), 0);
    const funnel = {
      total: leadTotal,
      byStage,
      trialed: byStage[LeadStage.TRIALED] || 0,
      signed: byStage[LeadStage.SIGNED] || 0,
      conversionRate: leadTotal ? Number(((byStage[LeadStage.SIGNED] || 0) / leadTotal).toFixed(4)) : 0,
    };

    return {
      revenue: {
        orderCount,
        paidOrderCount,
        receivable,
        received,
        refundAmount,
        netCashflow: received - refundAmount,
      },
      students: { total: totalStudents, studying, refunded: refundedStu },
      hours: { totalGranted: granted, totalConsumed: consumed, consumeRate, balance },
      classGroups: { count: cgCount, totalCapacity: capacity, enrolled, fullRate },
      admissionSummary: funnel,
      trend: await this.monthTrendAgg(t, months, dr),
    };
  }

  // ---------------- 招生看板（顾问视角） ----------------
  private async admission(t: number, q: any) {
    const dr = this.dateRange(q?.start, q?.end);
    // 渠道/活动字典表本身很小（几十条），可整表加载用于名称映射
    const [channels, campaigns] = await Promise.all([
      this.channelRepo.find({ where: { tenantId: t } }),
      this.campaignRepo.find({ where: { tenantId: t } }),
    ]);
    const chMap = new Map(channels.map((c) => [c.id, c.name]));
    const cpMap = new Map(campaigns.map((c) => [c.id, c.name]));

    const stageRows = await this.grouped(this.leadRepo, 'e.stage', ['COUNT(*) AS c'], t, dr);
    const byStage: Record<string, number> = {};
    for (const s of Object.values(LeadStage)) byStage[s] = 0;
    for (const r of stageRows) byStage[String(r.k)] = Number(r.c);
    const total = stageRows.reduce((a, r) => a + Number(r.c), 0);
    const funnel = {
      total,
      byStage,
      trialed: byStage[LeadStage.TRIALED] || 0,
      signed: byStage[LeadStage.SIGNED] || 0,
      conversionRate: total ? Number(((byStage[LeadStage.SIGNED] || 0) / total).toFixed(4)) : 0,
    };

    const toGroups = (rows: any[], nameMap: Map<number, string>) =>
      rows
        .filter((r) => r.k != null)
        .map((r) => ({ id: Number(r.k), name: nameMap.get(Number(r.k)) || `ID:${r.k}`, count: Number(r.c) }));

    const [chRows, cpRows, pendingFollow] = await Promise.all([
      this.grouped(this.leadRepo, 'e.channel_id', ['COUNT(*) AS c'], t, dr),
      this.grouped(this.leadRepo, 'e.campaign_id', ['COUNT(*) AS c'], t, dr),
      this.scalar(
        this.leadRepo,
        'COUNT(*)',
        t,
        this.mergeWhere(
          dr,
          `e.stage IN ('${LeadStage.NEW}','${LeadStage.FOLLOWING}') AND (e.last_follow_at IS NULL OR e.last_follow_at < :followCut)`,
          { followCut: new Date(Date.now() - 7 * 864e5) },
        ),
      ),
    ]);

    return {
      funnel: {
        total: funnel.total,
        trialed: funnel.trialed,
        signed: funnel.signed,
        conversionRate: funnel.conversionRate,
        byStage: funnel.byStage,
      },
      byChannel: toGroups(chRows, chMap),
      byCampaign: toGroups(cpRows, cpMap),
      pendingFollow,
    };
  }

  // ---------------- 教学看板（教务视角） ----------------
  private async teaching(t: number) {
    const todo = `e.status = '${TaskStatus.TODO}'`;
    const [
      attTotal, attPresent, hwCount, hsTotal, hsReviewed, hsLate, hsPending, hrExcellent,
      taskTodo, taskCourseReview, reviewCount,
    ] = await Promise.all([
      this.scalar(this.attRepo, 'COUNT(*)', t),
      this.scalar(this.attRepo, 'COUNT(*)', t, { sql: "e.status = 'PRESENT'" }),
      this.scalar(this.hwRepo, 'COUNT(*)', t),
      this.scalar(this.hsRepo, 'COUNT(*)', t),
      this.scalar(this.hsRepo, 'COUNT(*)', t, { sql: "e.status = 'REVIEWED'" }),
      this.scalar(this.hsRepo, 'COUNT(*)', t, { sql: 'e.is_late = 1' }),
      this.scalar(this.hsRepo, 'COUNT(*)', t, { sql: "e.status = 'SUBMITTED'" }),
      this.scalar(this.hrRepo, 'COUNT(*)', t, { sql: 'e.is_excellent = 1' }),
      this.scalar(this.taskRepo, 'COUNT(*)', t, { sql: todo }),
      this.scalar(this.taskRepo, 'COUNT(*)', t, { sql: `${todo} AND e.type = 'AFTER_CLASS_REVIEW'` }),
      this.scalar(this.reviewRepo, 'COUNT(*)', t),
    ]);

    const attendanceRate = attTotal ? Number((attPresent / attTotal).toFixed(4)) : 0;
    const reviewedRate = hsTotal ? Number((hsReviewed / hsTotal).toFixed(4)) : 0;
    const taskByType = (await this.grouped(this.taskRepo, 'e.type', ['COUNT(*) AS c'], t)).map((r) => ({
      type: String(r.k),
      count: Number(r.c),
    }));

    return {
      attendance: { total: attTotal, present: attPresent, attendanceRate },
      homework: {
        assigned: hwCount,
        submitted: hsTotal,
        reviewed: hsReviewed,
        reviewedRate,
        late: hsLate,
        excellent: hrExcellent,
        pendingHomework: hsPending,
      },
      courseReview: { count: reviewCount },
      tasks: { pending: taskTodo, byType: taskByType },
      alerts: [
        { code: 'PENDING_HOMEWORK', label: '待批改作业', value: hsPending },
        { code: 'PENDING_COURSE_REVIEW', label: '待写课后点评', value: taskCourseReview },
        { code: 'PENDING_TASK', label: '待办任务总数', value: taskTodo },
      ],
    };
  }

  // ---------------- 多校区汇总对标（§4.11 / §10 M8 多校区） ----------------
  async campusBenchmark(t: number) {
    // orgs 是配置数据（量极小）可整表；成本/物料改为按 org_id 分组聚合，避免全表加载
    const [orgs, costRows, matRows, allCost] = await Promise.all([
      this.orgRepo.find({ where: { tenantId: t } as any }),
      this.grouped(this.costRepo, 'e.org_id', ['COALESCE(SUM(e.amount),0) AS costTotal'], t),
      this.grouped(this.materialRepo, 'e.org_id', [
        'COUNT(*) AS cnt',
        'COALESCE(SUM(e.stock_qty * e.price),0) AS stockValue',
      ], t),
      this.scalar(this.costRepo, 'COALESCE(SUM(e.amount),0)', t),
    ]);
    const costMap = new Map<string, any>(costRows.map((r) => [String(r.k), r]));
    const matMap = new Map<string, any>(matRows.map((r) => [String(r.k), r]));

    const campuses = orgs
      .filter((o) => o.type === 'CAMPUS' || o.type === 'BRANCH')
      .map((o) => {
        const mat = matMap.get(String(o.id));
        const costTotal = Number(costMap.get(String(o.id))?.costTotal || 0);
        const stockValue = Number(mat?.stockValue || 0);
        return {
          id: o.id,
          name: o.name,
          type: o.type,
          costTotal: Number(costTotal.toFixed(2)),
          materialCount: Number(mat?.cnt || 0),
          stockValue: Number(stockValue.toFixed(2)),
        };
      });

    const ranked = [...campuses].sort((a, b) => b.costTotal - a.costTotal);
    return {
      campuses,
      totalCost: Number(allCost.toFixed(2)),
      campusCount: campuses.length,
      compare: {
        highestCost: ranked[0] || null,
        lowestCost: ranked[ranked.length - 1] || null,
        avgCost: campuses.length ? Number((allCost / campuses.length).toFixed(2)) : 0,
      },
    };
  }

  // ---------------- 总校区视角·多校区汇总对比（§4.11 / §10 M8 多校区） ----------------
  /**
   * 总校区视角下的跨校区汇总对比：聚合各校区在招生/经营/学员/课时/教学/成本
   * 六个维度的核心指标，并计算 HQ 合计与排名（营收冠军/转化冠军等）。
   * 使用原始 DataSource 仓库，绕过 X-Org-Id 校区隔离，确保看到全部校区。
   */
  async campusOverview(t: number) {
    const ds = this.ds;
    const g = 'e.org_id';
    // 全部改为「按 org_id 分组聚合」：内存从 O(全表行数) 降到 O(校区数)
    const [
      orgs,
      leadRows, stuRows, ordRows, haRows, hcRows, attRows, hsRows, costRows, matRows,
    ] = await Promise.all([
      ds.getRepository(Organization).find({ where: { tenantId: t } } as any),
      this.grouped(ds.getRepository(Lead), g, [
        'COUNT(*) AS leads',
        `COALESCE(SUM(CASE WHEN e.stage='${LeadStage.TRIALED}' THEN 1 ELSE 0 END),0) AS trialed`,
        `COALESCE(SUM(CASE WHEN e.stage='${LeadStage.SIGNED}' THEN 1 ELSE 0 END),0) AS signed`,
      ], t),
      this.grouped(ds.getRepository(Student), g, [
        'COUNT(*) AS total',
        `COALESCE(SUM(CASE WHEN e.status='${StudentStatus.STUDYING}' THEN 1 ELSE 0 END),0) AS studying`,
        `COALESCE(SUM(CASE WHEN e.status='${StudentStatus.REFUNDED}' THEN 1 ELSE 0 END),0) AS refunded`,
      ], t),
      this.grouped(ds.getRepository(Order), g, [
        'COUNT(*) AS orderCount',
        'COALESCE(SUM(e.payable_amount),0) AS receivable',
        'COALESCE(SUM(e.paid_amount),0) AS received',
        `COALESCE(SUM(CASE WHEN e.status='${OrderStatus.REFUNDED}' THEN e.payable_amount ELSE 0 END),0) AS refundAmount`,
      ], t),
      this.grouped(ds.getRepository(HourAccount), g, ['COALESCE(SUM(e.balance),0) AS balance'], t),
      this.grouped(ds.getRepository(HourConsumption), g, [
        "COALESCE(SUM(CASE WHEN e.type='GRANT' THEN e.hours ELSE 0 END),0) AS granted",
        "COALESCE(SUM(CASE WHEN e.type='CONSUME' THEN -e.hours ELSE 0 END),0) AS consumed",
      ], t),
      this.grouped(ds.getRepository(Attendance), g, [
        'COUNT(*) AS total',
        "COALESCE(SUM(CASE WHEN e.status='PRESENT' THEN 1 ELSE 0 END),0) AS present",
      ], t),
      this.grouped(ds.getRepository(HomeworkSubmit), g, [
        'COUNT(*) AS total',
        "COALESCE(SUM(CASE WHEN e.status='REVIEWED' THEN 1 ELSE 0 END),0) AS reviewed",
        "COALESCE(SUM(CASE WHEN e.status='SUBMITTED' THEN 1 ELSE 0 END),0) AS pending",
      ], t),
      this.grouped(ds.getRepository(CostRecord), g, ['COALESCE(SUM(e.amount),0) AS costTotal'], t),
      this.grouped(ds.getRepository(Material), g, [
        'COUNT(*) AS materialCount',
        'COALESCE(SUM(e.stock_qty * e.price),0) AS stockValue',
      ], t),
    ]);

    // 无 org_id 的记录不计入任何校区（与旧实现保持一致的统计口径）
    const toMap = (rows: any[]) => {
      const m = new Map<number, any>();
      for (const r of rows) {
        if (r.k == null) continue;
        m.set(Number(r.k), r);
      }
      return m;
    };
    const leadM = toMap(leadRows);
    const stuM = toMap(stuRows);
    const ordM = toMap(ordRows);
    const haM = toMap(haRows);
    const hcM = toMap(hcRows);
    const attM = toMap(attRows);
    const hsM = toMap(hsRows);
    const costM = toMap(costRows);
    const matM = toMap(matRows);

    const campuses = orgs
      .filter((o) => o.type === 'CAMPUS' || o.type === 'BRANCH')
      .map((o) => {
        const lead = leadM.get(o.id);
        const stu = stuM.get(o.id);
        const ord = ordM.get(o.id);
        const ha = haM.get(o.id);
        const hc = hcM.get(o.id);
        const att = attM.get(o.id);
        const hs = hsM.get(o.id);
        const cost = costM.get(o.id);
        const mat = matM.get(o.id);

        const leads = Number(lead?.leads || 0);
        const signed = Number(lead?.signed || 0);
        const receivable = Number(ord?.receivable || 0);
        const received = Number(ord?.received || 0);
        const refundAmount = Number(ord?.refundAmount || 0);
        const studying = Number(stu?.studying || 0);
        const granted = Number(hc?.granted || 0);
        const consumed = Number(hc?.consumed || 0);
        const consumeRate = granted ? Number((consumed / granted).toFixed(4)) : 0;
        const attTotal = Number(att?.total || 0);
        const attPresent = Number(att?.present || 0);
        const attendanceRate = attTotal ? Number((attPresent / attTotal).toFixed(4)) : 0;
        const hsTotal = Number(hs?.total || 0);
        const reviewed = Number(hs?.reviewed || 0);
        const reviewedRate = hsTotal ? Number((reviewed / hsTotal).toFixed(4)) : 0;

        return {
          id: o.id,
          name: o.name,
          type: o.type,
          admission: {
            leads,
            trialed: Number(lead?.trialed || 0),
            signed,
            conversionRate: leads ? Number((signed / leads).toFixed(4)) : 0,
          },
          revenue: {
            orderCount: Number(ord?.orderCount || 0),
            receivable: Number(receivable.toFixed(2)),
            received: Number(received.toFixed(2)),
            refundAmount: Number(refundAmount.toFixed(2)),
            netCashflow: Number((received - refundAmount).toFixed(2)),
          },
          students: { total: Number(stu?.total || 0), studying, refunded: Number(stu?.refunded || 0) },
          hours: {
            granted,
            consumed,
            balance: Number(ha?.balance || 0),
            consumeRate,
          },
          teaching: {
            attendanceRate,
            reviewedRate,
            homeworkPending: Number(hs?.pending || 0),
          },
          cost: {
            costTotal: Number(Number(cost?.costTotal || 0).toFixed(2)),
            stockValue: Number(Number(mat?.stockValue || 0).toFixed(2)),
            materialCount: Number(mat?.materialCount || 0),
          },
          rank: 0,
        };
      });

    // 按已收金额排名（HQ 营收视角）
    const ranked = [...campuses].sort((a, b) => b.revenue.received - a.revenue.received);
    ranked.forEach((c, i) => (c.rank = i + 1));

    const agg = (sel: (c: (typeof campuses)[number]) => number) =>
      campuses.reduce((a, c) => a + (Number(sel(c)) || 0), 0);
    const round = (v: number, p = 2) => Number(v.toFixed(p));
    const summary = {
      campusCount: campuses.length,
      received: round(agg((c) => c.revenue.received)),
      receivable: round(agg((c) => c.revenue.receivable)),
      netCashflow: round(agg((c) => c.revenue.netCashflow)),
      refundAmount: round(agg((c) => c.revenue.refundAmount)),
      studying: agg((c) => c.students.studying),
      totalStudents: agg((c) => c.students.total),
      signed: agg((c) => c.admission.signed),
      leads: agg((c) => c.admission.leads),
      costTotal: round(agg((c) => c.cost.costTotal)),
      stockValue: round(agg((c) => c.cost.stockValue)),
      avgConversion: campuses.length ? round(agg((c) => c.admission.conversionRate) / campuses.length, 4) : 0,
      avgAttendance: campuses.length ? round(agg((c) => c.teaching.attendanceRate) / campuses.length, 4) : 0,
      avgConsumeRate: campuses.length ? round(agg((c) => c.hours.consumeRate) / campuses.length, 4) : 0,
    };

    let compare: any = null;
    if (campuses.length) {
      const best = (sel: (c: (typeof campuses)[number]) => number) =>
        campuses.reduce((b, c) => (sel(c) > sel(b) ? c : b));
      const worst = (sel: (c: (typeof campuses)[number]) => number) =>
        campuses.reduce((b, c) => (sel(c) < sel(b) ? c : b));
      const avg = (sel: (c: (typeof campuses)[number]) => number) =>
        round(agg(sel) / campuses.length, 4);
      compare = {
        received: {
          top: { id: best((c) => c.revenue.received).id, name: best((c) => c.revenue.received).name, value: best((c) => c.revenue.received).revenue.received },
          bottom: { id: worst((c) => c.revenue.received).id, name: worst((c) => c.revenue.received).name, value: worst((c) => c.revenue.received).revenue.received },
          avg: avg((c) => c.revenue.received),
        },
        conversion: {
          top: { id: best((c) => c.admission.conversionRate).id, name: best((c) => c.admission.conversionRate).name, value: best((c) => c.admission.conversionRate).admission.conversionRate },
          bottom: { id: worst((c) => c.admission.conversionRate).id, name: worst((c) => c.admission.conversionRate).name, value: worst((c) => c.admission.conversionRate).admission.conversionRate },
          avg: avg((c) => c.admission.conversionRate),
        },
        attendance: {
          top: { id: best((c) => c.teaching.attendanceRate).id, name: best((c) => c.teaching.attendanceRate).name, value: best((c) => c.teaching.attendanceRate).teaching.attendanceRate },
          bottom: { id: worst((c) => c.teaching.attendanceRate).id, name: worst((c) => c.teaching.attendanceRate).name, value: worst((c) => c.teaching.attendanceRate).teaching.attendanceRate },
          avg: avg((c) => c.teaching.attendanceRate),
        },
        consumeRate: {
          top: { id: best((c) => c.hours.consumeRate).id, name: best((c) => c.hours.consumeRate).name, value: best((c) => c.hours.consumeRate).hours.consumeRate },
          bottom: { id: worst((c) => c.hours.consumeRate).id, name: worst((c) => c.hours.consumeRate).name, value: worst((c) => c.hours.consumeRate).hours.consumeRate },
          avg: avg((c) => c.hours.consumeRate),
        },
        signed: {
          top: { id: best((c) => c.admission.signed).id, name: best((c) => c.admission.signed).name, value: best((c) => c.admission.signed).admission.signed },
          bottom: { id: worst((c) => c.admission.signed).id, name: worst((c) => c.admission.signed).name, value: worst((c) => c.admission.signed).admission.signed },
          avg: avg((c) => c.admission.signed),
        },
      };
    }

    return { campuses, summary, compare };
  }

  // ---------------- 自定义报表（§4.10 报表增强） ----------------
  async customReport(t: number, d: any) {
    const allowedDim: any = { order: ['status', 'month'], lead: ['channel', 'campaign', 'stage'] };
    const allowedMet: any = {
      order: ['orderCount', 'receivable', 'received', 'refundAmount', 'studentCount'],
      lead: ['leadCount', 'trial', 'signed'],
    };
    if (!allowedDim[d.source]) throw new BadRequestException('source 必须为 order | lead');
    for (const dim of d.dimensions || [])
      if (!allowedDim[d.source].includes(dim)) throw new BadRequestException(`不支持维度 ${dim}`);
    for (const met of d.metrics || [])
      if (!allowedMet[d.source].includes(met)) throw new BadRequestException(`不支持指标 ${met}`);

    const repo = d.source === 'order' ? this.orderRepo : this.leadRepo;
    const dims: string[] = d.dimensions || [];
    const mets: string[] = d.metrics || [];

    const dimExpr = (dim: string) => {
      if (dim === 'month') return this.monthExpr();
      if (dim === 'channel') return 'e.channel_id';
      if (dim === 'campaign') return 'e.campaign_id';
      return d.source === 'order' ? 'e.status' : 'e.stage';
    };
    const metExpr = (met: string) => {
      switch (met) {
        case 'orderCount':
        case 'leadCount':
          return 'COUNT(*)';
        case 'receivable':
          return 'COALESCE(SUM(e.payable_amount),0)';
        case 'received':
          return `COALESCE(SUM(CASE WHEN e.status='${OrderStatus.PAID}' OR e.status='${OrderStatus.COMPLETED}' THEN e.paid_amount ELSE 0 END),0)`;
        case 'refundAmount':
          return `COALESCE(SUM(CASE WHEN e.status='${OrderStatus.REFUNDED}' THEN e.payable_amount ELSE 0 END),0)`;
        case 'studentCount':
          return 'COUNT(DISTINCT e.student_id)';
        case 'trial':
          return `COALESCE(SUM(CASE WHEN e.stage='${LeadStage.TRIALED}' THEN 1 ELSE 0 END),0)`;
        case 'signed':
          return `COALESCE(SUM(CASE WHEN e.stage='${LeadStage.SIGNED}' THEN 1 ELSE 0 END),0)`;
        default:
          return null;
      }
    };
    const fmtDim = (dim: string, k: any) => {
      if (k == null) return 'null';
      if (dim === 'channel') return `channel:${k}`;
      if (dim === 'campaign') return `campaign:${k}`;
      return String(k);
    };

    const selects = mets.map((m) => `${metExpr(m)} AS m_${m}`);
    const raw = await this.grouped(
      repo,
      dims.map(dimExpr),
      selects,
      t,
      this.dateRange(d.start, d.end),
    );

    const out = raw
      .map((r) => {
        const row: any = { key: dims.map((dm, i) => fmtDim(dm, dims.length === 1 ? r.k : r[`k${i}`])).join('|') };
        dims.forEach((dm, i) => { row[dm] = fmtDim(dm, dims.length === 1 ? r.k : r[`k${i}`]); });
        for (const met of mets) row[met] = Number(r[`m_${met}`] || 0);
        return row;
      })
      .sort((a, b) => a.key.localeCompare(b.key));
    return { source: d.source, dimensions: d.dimensions, metrics: d.metrics, rows: out };
  }

  // ---------------- 报表导出（Excel/PDF，后端生成文件流） ----------------
  private readonly REPORT_LABELS: Record<string, string> = {
    status: '状态',
    month: '月份',
    channel: '渠道',
    campaign: '活动',
    stage: '阶段',
    orderCount: '订单数',
    receivable: '应收金额',
    received: '已收金额',
    refundAmount: '退款金额',
    studentCount: '学员数',
    leadCount: '线索数',
    trial: '试听数',
    signed: '签约数',
  };

  /** 自定义报表导出：复用聚合结果，套用中文表头，输出 CSV/PDF 文件流 */
  async exportReport(
    t: number,
    d: { source: string; dimensions: string[]; metrics: string[]; format: 'excel' | 'pdf'; title?: string; start?: string; end?: string },
  ): Promise<ExportFile> {
    const result = await this.customReport(t, d); // 内部完成 source/维度/指标校验
    const columns: ExportColumn[] = [
      ...d.dimensions.map((dim) => ({ key: dim, label: this.REPORT_LABELS[dim] || dim })),
      ...d.metrics.map((met) => ({ key: met, label: this.REPORT_LABELS[met] || met })),
    ];
    const title = d.title || `自定义报表_${d.source}_${new Date().toISOString().slice(0, 10)}`;
    const input = { title, columns, rows: result.rows };
    return d.format === 'pdf' ? buildPdf(input) : buildCsv(input);
  }

  /** 多校区对标导出（含中文，仅支持 Excel/CSV） */
  async exportBenchmark(t: number, format: string): Promise<ExportFile> {
    if (format === 'pdf') {
      throw new BadRequestException('校区对标含中文，请使用 Excel(CSV) 导出');
    }
    const b = await this.campusBenchmark(t);
    const columns: ExportColumn[] = [
      { key: 'name', label: '校区' },
      { key: 'type', label: '类型' },
      { key: 'costTotal', label: '成本合计' },
      { key: 'materialCount', label: '物料数' },
      { key: 'stockValue', label: '库存金额' },
    ];
    const summary = {
      name: '合计',
      type: '',
      costTotal: b.totalCost,
      materialCount: '',
      stockValue: '',
    };
    const title = `多校区对标_${new Date().toISOString().slice(0, 10)}`;
    return buildCsv({ title, columns, rows: [...b.campuses, summary] });
  }
}
