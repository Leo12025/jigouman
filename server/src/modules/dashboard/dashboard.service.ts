import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { Channel } from '../lead/entities/channel.entity';
import { Campaign } from '../lead/entities/campaign.entity';
import { DashboardRole, DASHBOARD_ROLES } from './dto/dashboard.dto';

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
  ) {}

  async byRole(t: number, role: string, q: any) {
    if (!DASHBOARD_ROLES.includes(role as DashboardRole)) {
      throw new BadRequestException(`role 必须为 ${DASHBOARD_ROLES.join(' | ')}`);
    }
    const months = Number(q?.months) || 6;
    switch (role) {
      case 'principal':
        return this.principal(t, q, months);
      case 'admission':
        return this.admission(t, q);
      case 'teaching':
        return this.teaching(t);
      default:
        throw new BadRequestException('unknown role');
    }
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
