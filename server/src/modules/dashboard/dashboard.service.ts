import { orgRepo as orgScoped } from '../../common/org-scope';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  /** 内置指标注册表：code -> 计算函数（复用已注入仓储，规避 SQL 方言差异） */
  private async computeMetric(code: string, t: number): Promise<number | null> {
    switch (code) {
      case 'REVENUE_RECEIVED':
        return this.sum(
          (await this.orderRepo.find({ where: { tenantId: t } })).filter(
            (o) => o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED,
          ),
          'paidAmount',
        );
      case 'REVENUE_RECEIVABLE':
        return this.sum(await this.orderRepo.find({ where: { tenantId: t } }), 'payableAmount');
      case 'REFUND_AMOUNT':
        return this.sum(
          (await this.orderRepo.find({ where: { tenantId: t } })).filter(
            (o) => o.status === OrderStatus.REFUNDED,
          ),
          'payableAmount',
        );
      case 'TOTAL_STUDENTS':
        return (await this.studentRepo.find({ where: { tenantId: t } })).length;
      case 'STUDYING_STUDENTS':
        return (await this.studentRepo.find({ where: { tenantId: t } })).filter(
          (s) => s.status === StudentStatus.STUDYING,
        ).length;
      case 'REFUNDED_STUDENTS':
        return (await this.studentRepo.find({ where: { tenantId: t } })).filter(
          (s) => s.status === StudentStatus.REFUNDED,
        ).length;
      case 'CONSUME_RATE': {
        const hc = await this.hcRepo.find({ where: { tenantId: t } });
        const granted = this.sum(hc.filter((h) => h.type === 'GRANT'), 'hours');
        const consumed = -this.sum(hc.filter((h) => h.type === 'CONSUME'), 'hours');
        return granted ? Number((consumed / granted).toFixed(4)) : 0;
      }
      case 'FULL_RATE': {
        const cgs = await this.cgRepo.find({ where: { tenantId: t } });
        const enrolled = (await this.scRepo.find({ where: { tenantId: t } })).filter(
          (s) => s.status === 'ACTIVE',
        ).length;
        const cap = this.sum(cgs, 'capacity');
        return cap ? Number((enrolled / cap).toFixed(4)) : 0;
      }
      case 'ATTENDANCE_RATE': {
        const att = await this.attRepo.find({ where: { tenantId: t } });
        if (!att.length) return 0;
        const present = att.filter((a) => a.status === 'PRESENT').length;
        return Number((present / att.length).toFixed(4));
      }
      case 'TRIAL_CONVERSION': {
        const leads = await this.leadRepo.find({ where: { tenantId: t } });
        if (!leads.length) return 0;
        const signed = leads.filter((l) => l.stage === LeadStage.SIGNED).length;
        return Number((signed / leads.length).toFixed(4));
      }
      case 'TOTAL_LEADS':
        return (await this.leadRepo.find({ where: { tenantId: t } })).length;
      case 'PENDING_HOMEWORK':
        return (await this.hsRepo.find({ where: { tenantId: t } })).filter(
          (s) => s.status === 'SUBMITTED',
        ).length;
      case 'PENDING_REVIEW':
        return (await this.taskRepo.find({ where: { tenantId: t } })).filter(
          (x) => x.status === TaskStatus.TODO,
        ).length;
      case 'PENDING_COURSE_REVIEW':
        return (await this.taskRepo.find({ where: { tenantId: t } })).filter(
          (x) => x.status === TaskStatus.TODO && x.type === 'AFTER_CLASS_REVIEW',
        ).length;
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

  // ---------------- 经营看板（校长视角） ----------------
  private async principal(t: number, q: any, months: number) {
    const [orders, students, ha, hc, cgs, leads] = await Promise.all([
      this.orderRepo.find({ where: { tenantId: t } }),
      this.studentRepo.find({ where: { tenantId: t } }),
      this.haRepo.find({ where: { tenantId: t } }),
      this.hcRepo.find({ where: { tenantId: t } }),
      this.cgRepo.find({ where: { tenantId: t } }),
      this.leadRepo.find({ where: { tenantId: t } }),
    ]);

    const filtered = this.filterByDate(orders, q?.start, q?.end);
    const paidOrders = filtered.filter(
      (o) => o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED,
    );
    const refunded = filtered.filter((o) => o.status === OrderStatus.REFUNDED);
    const receivable = this.sum(filtered, 'payableAmount');
    const received = this.sum(filtered, 'paidAmount');
    const refundAmount = this.sum(refunded, 'payableAmount');

    const studying = students.filter((s) => s.status === StudentStatus.STUDYING).length;
    const refundedStu = students.filter((s) => s.status === StudentStatus.REFUNDED).length;

    const granted = this.sum(
      hc.filter((h) => h.type === 'GRANT'),
      'hours',
    );
    const consumed = -this.sum(
      hc.filter((h) => h.type === 'CONSUME'),
      'hours',
    );
    const consumeRate = granted ? Number((consumed / granted).toFixed(4)) : 0;

    const totalCapacity = this.sum(cgs, 'capacity');
    const enrolled = (await this.scRepo.find({ where: { tenantId: t } })).filter(
      (s) => s.status === 'ACTIVE',
    ).length;
    const fullRate = totalCapacity ? Number((enrolled / totalCapacity).toFixed(4)) : 0;

    return {
      revenue: {
        orderCount: filtered.length,
        paidOrderCount: paidOrders.length,
        receivable,
        received,
        refundAmount,
        netCashflow: received - refundAmount,
      },
      students: {
        total: students.length,
        studying,
        refunded: refundedStu,
      },
      hours: {
        totalGranted: granted,
        totalConsumed: consumed,
        consumeRate,
        balance: this.sum(ha, 'balance'),
      },
      classGroups: {
        count: cgs.length,
        totalCapacity,
        enrolled,
        fullRate,
      },
      admissionSummary: this.funnelOf(leads),
      trend: this.monthTrend(orders, hc, months),
    };
  }

  // ---------------- 招生看板（顾问视角） ----------------
  private async admission(t: number, q: any) {
    const [leads, channels, campaigns] = await Promise.all([
      this.leadRepo.find({ where: { tenantId: t } }),
      this.channelRepo.find({ where: { tenantId: t } }),
      this.campaignRepo.find({ where: { tenantId: t } }),
    ]);
    const filtered = this.filterByDate(leads, q?.start, q?.end);
    const funnel = this.funnelOf(filtered);
    const chMap = new Map(channels.map((c) => [c.id, c.name]));
    const cpMap = new Map(campaigns.map((c) => [c.id, c.name]));

    const now = Date.now();
    const pendingFollow = filtered.filter(
      (l) =>
        (l.stage === LeadStage.NEW || l.stage === LeadStage.FOLLOWING) &&
        (!l.lastFollowAt || new Date(l.lastFollowAt).getTime() < now - 7 * 864e5),
    ).length;

    return {
      funnel: {
        total: funnel.total,
        trialed: funnel.trialed,
        signed: funnel.signed,
        conversionRate: funnel.conversionRate,
        byStage: funnel.byStage,
      },
      byChannel: this.groupCount(filtered, 'channelId', chMap),
      byCampaign: this.groupCount(filtered, 'campaignId', cpMap),
      pendingFollow,
    };
  }

  // ---------------- 教学看板（教务视角） ----------------
  private async teaching(t: number) {
    const [att, hw, hs, hr, tasks, reviews] = await Promise.all([
      this.attRepo.find({ where: { tenantId: t } }),
      this.hwRepo.find({ where: { tenantId: t } }),
      this.hsRepo.find({ where: { tenantId: t } }),
      this.hrRepo.find({ where: { tenantId: t } }),
      this.taskRepo.find({ where: { tenantId: t } }),
      this.reviewRepo.find({ where: { tenantId: t } }),
    ]);

    const total = att.length;
    const present = att.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate = total ? Number((present / total).toFixed(4)) : 0;

    const submitted = hs.length;
    const reviewed = hs.filter((s) => s.status === 'REVIEWED').length;
    const late = hs.filter((s) => s.isLate === 1).length;
    const excellent = hr.filter((r) => r.isExcellent === 1).length;
    const pendingHomework = hs.filter((s) => s.status === 'SUBMITTED').length;
    const reviewedRate = submitted ? Number((reviewed / submitted).toFixed(4)) : 0;

    const pendingReview = tasks.filter((x) => x.status === TaskStatus.TODO).length;
    const pendingCourseReview = tasks.filter(
      (x) => x.status === TaskStatus.TODO && x.type === 'AFTER_CLASS_REVIEW',
    ).length;

    return {
      attendance: { total, present, attendanceRate },
      homework: {
        assigned: hw.length,
        submitted,
        reviewed,
        reviewedRate,
        late,
        excellent,
        pendingHomework,
      },
      courseReview: { count: reviews.length },
      tasks: { pending: pendingReview, byType: this.groupTask(tasks) },
      alerts: [
        { code: 'PENDING_HOMEWORK', label: '待批改作业', value: pendingHomework },
        { code: 'PENDING_COURSE_REVIEW', label: '待写课后点评', value: pendingCourseReview },
        { code: 'PENDING_TASK', label: '待办任务总数', value: pendingReview },
      ],
    };
  }

  // ---------------- 多校区汇总对标（§4.11 / §10 M8 多校区） ----------------
  async campusBenchmark(t: number) {
    const orgs = await this.orgRepo.find({ where: { tenantId: t } as any });
    const costs = await this.costRepo.find({ where: { tenantId: t } as any });
    const materials = await this.materialRepo.find({ where: { tenantId: t } as any });

    const campuses = orgs
      .filter((o) => o.type === 'CAMPUS' || o.type === 'BRANCH')
      .map((o) => {
        const orgCosts = costs.filter((c) => c.orgId === o.id);
        const orgMat = materials.filter((m) => m.orgId === o.id);
        const costTotal = this.sum(orgCosts, 'amount');
        const stockValue = orgMat.reduce(
          (a, m) => a + (Number(m.stockQty) || 0) * (Number(m.price) || 0),
          0,
        );
        return {
          id: o.id,
          name: o.name,
          type: o.type,
          costTotal: Number(costTotal.toFixed(2)),
          materialCount: orgMat.length,
          stockValue: Number(stockValue.toFixed(2)),
        };
      });

    const allCost = this.sum(costs, 'amount');
    const ranked = [...campuses].sort((a, b) => b.costTotal - a.costTotal);
    return {
      campuses,
      totalCost: Number(allCost.toFixed(2)),
      campusCount: campuses.length,
      compare: {
        highestCost: ranked[0] || null,
        lowestCost: ranked[ranked.length - 1] || null,
        avgCost: campuses.length
          ? Number((allCost / campuses.length).toFixed(2))
          : 0,
      },
    };
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

    const rows = d.source === 'order'
      ? await this.orderRepo.find({ where: { tenantId: t } })
      : await this.leadRepo.find({ where: { tenantId: t } });
    const filtered = this.filterByDate(rows as any, d.start, d.end);

    const map = new Map<string, any>();
    for (const r of filtered) {
      const dimVals: any = {};
      for (const dim of d.dimensions) dimVals[dim] = this.dimValue(d.source, dim, r);
      const key = d.dimensions.map((dm: string) => String(dimVals[dm])).join('|');
      if (!map.has(key)) {
        map.set(key, { key, dims: dimVals, _students: new Set<number>() });
      }
      const agg = map.get(key)!;
      agg._students.add((r as any).studentId);
      agg.orderCount = (agg.orderCount || 0) + 1;
      agg.leadCount = (agg.leadCount || 0) + 1;
      agg.receivable = (agg.receivable || 0) + Number((r as any).payableAmount || 0);
      agg.received = (agg.received || 0) + (d.source === 'order' && ((r as any).status === OrderStatus.PAID || (r as any).status === OrderStatus.COMPLETED) ? Number((r as any).paidAmount || 0) : 0);
      agg.refundAmount = (agg.refundAmount || 0) + (d.source === 'order' && (r as any).status === OrderStatus.REFUNDED ? Number((r as any).payableAmount || 0) : 0);
      agg.trial = (agg.trial || 0) + (d.source === 'lead' && (r as any).stage === LeadStage.TRIALED ? 1 : 0);
      agg.signed = (agg.signed || 0) + (d.source === 'lead' && (r as any).stage === LeadStage.SIGNED ? 1 : 0);
    }

    const out = [...map.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((a) => {
        const row: any = { key: a.key };
        for (const dm of d.dimensions) row[dm] = a.dims[dm];
        for (const met of d.metrics) {
          if (met === 'studentCount') row[met] = a._students.size;
          else row[met] = Number((a[met] || 0).toFixed ? (a[met] || 0) : 0);
        }
        return row;
      });
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

  private dimValue(source: string, dim: string, r: any): string {
    if (dim === 'month') {
      if (!r.createdAt) return 'unknown';
      const d = new Date(r.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (source === 'lead' && dim === 'channel') return `channel:${r.channelId ?? 'null'}`;
    if (source === 'lead' && dim === 'campaign') return `campaign:${r.campaignId ?? 'null'}`;
    return String(r[dim] ?? 'null');
  }

  // ---------------- 聚合辅助 ----------------
  private filterByDate<T extends { createdAt?: Date }>(
    rows: T[],
    start?: string,
    end?: string,
  ): T[] {
    if (!start && !end) return rows;
    const s = start ? new Date(start).getTime() : -Infinity;
    const e = end ? new Date(end).getTime() : Infinity;
    return rows.filter((r) => {
      const ts = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
      return ts >= s && ts <= e;
    });
  }

  private sum(arr: any[], key: string): number {
    return arr.reduce((a, b) => a + (Number(b[key]) || 0), 0);
  }

  private funnelOf(leads: Lead[]) {
    const byStage: Record<string, number> = {};
    for (const s of Object.values(LeadStage)) byStage[s] = 0;
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] || 0) + 1;
    const total = leads.length;
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

  private groupCount(rows: any[], key: string, nameMap: Map<number, string>) {
    const m = new Map<number, number>();
    for (const r of rows) {
      const k = r[key];
      if (k == null) continue;
      m.set(Number(k), (m.get(Number(k)) || 0) + 1);
    }
    return [...m.entries()].map(([id, count]) => ({
      id,
      name: nameMap.get(id) || `ID:${id}`,
      count,
    }));
  }

  private groupTask(tasks: Task[]) {
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.type, (m.get(t.type) || 0) + 1);
    return [...m.entries()].map(([type, count]) => ({ type, count }));
  }

  private monthTrend(orders: Order[], hc: HourConsumption[], months: number) {
    const arr: any[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = (x: { createdAt?: Date }) => {
        if (!x.createdAt) return false;
        const dt = new Date(x.createdAt);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` === ym;
      };
      const o = orders.filter(inMonth);
      const c = hc.filter((h) => h.type === 'CONSUME' && inMonth(h));
      arr.push({
        month: ym,
        receivable: this.sum(o, 'payableAmount'),
        received: this.sum(o, 'paidAmount'),
        consumed: -this.sum(c, 'hours'),
      });
    }
    return arr;
  }
}
