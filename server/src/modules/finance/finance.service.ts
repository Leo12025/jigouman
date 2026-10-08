import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { SplitConfig } from './entities/split-config.entity';
import {
  SplitRecord, SplitType, SplitStatus,
} from './entities/split-record.entity';
import { Salary, SalaryStatus } from './entities/salary.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { HourAccount } from '../../modules/hour/entities/hour-account.entity';
import { HourConsumption } from '../../modules/hour/entities/hour-consumption.entity';
import {
  SplitPageQueryDto, SettleSplitDto, GenerateSalaryDto, SalaryPageQueryDto,
  ApplyInvoiceDto, InvoicePageQueryDto, FinanceSummaryQueryDto, UpsertSplitConfigDto,
} from './dto/finance.dto';

function periodOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(SplitConfig) private readonly cfgRepo: Repository<SplitConfig>,
    @InjectRepository(SplitRecord) private readonly splitRepo: Repository<SplitRecord>,
    @InjectRepository(Salary) private readonly salaryRepo: Repository<Salary>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(HourAccount) private readonly accRepo: Repository<HourAccount>,
    @InjectRepository(HourConsumption) private readonly consRepo: Repository<HourConsumption>,
  ) {}

  // ---------------- 分账配置 ----------------
  async getConfig(tenantId: number): Promise<SplitConfig> {
    let cfg = await this.cfgRepo.findOne({ where: { tenantId } as any });
    if (!cfg) {
      cfg = await this.cfgRepo.save(
        this.cfgRepo.create({ tenantId, teacherRate: 0.3, channelRate: 0.1, bonusRate: 0.1 } as SplitConfig),
      );
    }
    return cfg;
  }
  async upsertConfig(tenantId: number, d: UpsertSplitConfigDto) {
    const cfg = await this.getConfig(tenantId);
    if (d.teacherRate !== undefined) cfg.teacherRate = d.teacherRate;
    if (d.channelRate !== undefined) cfg.channelRate = d.channelRate;
    if (d.bonusRate !== undefined) cfg.bonusRate = d.bonusRate;
    return this.cfgRepo.save(cfg as any);
  }

  // ---------------- 分账记录 ----------------
  /** 消课事件钩子：按课时价值(发放时单价) × 提成率生成教师分账记录（文档 §4.5） */
  async onConsume(
    tenantId: number,
    p: { studentId: number; courseId?: number; teacherId?: number; lessonId?: number; consumptionId?: number; hours: number; channelPartnerId?: number },
  ) {
    if (!p.teacherId || !p.courseId || p.hours <= 0) return null;
    // 取该账户发放记录(GRANT)中的课时单价 → 课时价值
    const acc = await this.accRepo.findOne({ where: { tenantId, studentId: p.studentId, courseId: p.courseId } as any });
    let baseAmount = 0;
    let orderId: number | undefined;
    if (acc) {
      const grantRow = await this.consRepo.createQueryBuilder('c')
        .where('c.tenant_id = :t', { t: tenantId })
        .andWhere('c.account_id = :a', { a: acc.id })
        .andWhere("c.type = 'GRANT'")
        .andWhere('c.ref_order_id IS NOT NULL')
        .orderBy('c.id', 'ASC')
        .getOne();
      if (grantRow?.refOrderId) {
        orderId = grantRow.refOrderId;
        const unit = Number(grantRow.unitValue) || 0;
        baseAmount = r2(unit * p.hours);
      }
    }
    if (baseAmount <= 0) return null;
    const cfg = await this.getConfig(tenantId);
    const amount = r2(baseAmount * cfg.teacherRate);
    const rec = this.splitRepo.create({
      tenantId,
      orderId,
      lessonId: p.lessonId,
      courseId: p.courseId,
      teacherId: p.teacherId,
      channelPartnerId: p.channelPartnerId,
      type: SplitType.TEACHER_COMMISSION,
      baseAmount,
      rate: cfg.teacherRate,
      amount,
      period: periodOf(new Date()),
      status: SplitStatus.PENDING,
      refConsumptionId: p.consumptionId,
    } as any);
    return this.splitRepo.save(rec as any);
  }

  async listSplits(tenantId: number, q: SplitPageQueryDto) {
    const where: any = { tenantId };
    if (q.period) where.period = q.period;
    if (q.teacherId) where.teacherId = q.teacherId;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    const [list, total] = await this.splitRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async settleSplits(tenantId: number, d: SettleSplitDto) {
    const qb = this.splitRepo.createQueryBuilder('s')
      .where('s.tenant_id = :t', { t: tenantId })
      .andWhere("s.status = 'PENDING'");
    if (d.period) qb.andWhere('s.period = :p', { p: d.period });
    if (d.teacherId) qb.andWhere('s.teacher_id = :tid', { tid: d.teacherId });
    if (d.ids?.length) qb.andWhere('s.id IN (:...ids)', { ids: d.ids });
    if (!d.period && !d.teacherId && !d.ids?.length) qb.andWhere('1=0'); // 防止误清全部
    const recs = await qb.getMany();
    for (const r of recs) {
      r.status = SplitStatus.SETTLED;
      r.settledAt = new Date();
    }
    await this.splitRepo.save(recs as any[]);
    return { settled: recs.length };
  }

  // ---------------- 教师工资 ----------------
  async generateSalary(tenantId: number, d: GenerateSalaryDto) {
    const where: any = { tenantId, period: d.period };
    if (d.teacherId) where.teacherId = d.teacherId;
    const splits = await this.splitRepo.find({ where });
    const byTeacher = new Map<number, { lessons: Set<number>; hours: number; amount: number }>();
    for (const s of splits) {
      if (!s.teacherId) continue;
      const cur = byTeacher.get(s.teacherId) || { lessons: new Set(), hours: 0, amount: 0 };
      if (s.lessonId) cur.lessons.add(s.lessonId);
      cur.hours += 1; // 每次消课记 1 课时
      cur.amount += Number(s.amount) || 0;
      byTeacher.set(s.teacherId, cur);
    }
    const cfg = await this.getConfig(tenantId);
    const saved: Salary[] = [];
    for (const [teacherId, agg] of byTeacher) {
      const baseAmount = r2(agg.amount);
      const bonus = r2(baseAmount * cfg.bonusRate);
      const total = r2(baseAmount + bonus);
      let salary = await this.salaryRepo.findOne({ where: { tenantId, period: d.period, teacherId } as any });
      if (!salary) salary = this.salaryRepo.create({ tenantId, period: d.period, teacherId } as Salary);
      salary.lessonsCount = agg.lessons.size;
      salary.hoursCount = agg.hours;
      salary.baseAmount = baseAmount;
      salary.bonus = bonus;
      salary.total = total;
      salary.status = SalaryStatus.DRAFT;
      saved.push(await this.salaryRepo.save(salary as any));
    }
    return saved;
  }

  async listSalary(tenantId: number, q: SalaryPageQueryDto) {
    const where: any = { tenantId };
    if (q.period) where.period = q.period;
    if (q.teacherId) where.teacherId = q.teacherId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.salaryRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async confirmSalary(tenantId: number, id: number) {
    const s = await this.salaryRepo.findOne({ where: { tenantId, id } as any });
    if (!s) throw new NotFoundException('工资单不存在');
    s.status = SalaryStatus.CONFIRMED;
    return this.salaryRepo.save(s as any);
  }
  async paySalary(tenantId: number, id: number) {
    const s = await this.salaryRepo.findOne({ where: { tenantId, id } as any });
    if (!s) throw new NotFoundException('工资单不存在');
    s.status = SalaryStatus.PAID;
    s.paidAt = new Date();
    return this.salaryRepo.save(s as any);
  }

  // ---------------- 发票 ----------------
  async applyInvoice(tenantId: number, d: ApplyInvoiceDto) {
    const invoice = this.invoiceRepo.create({
      tenantId,
      orderId: d.orderId,
      studentId: d.studentId,
      type: 'ELECTRONIC',
      title: d.title,
      taxNo: d.taxNo,
      amount: d.amount || 0,
      status: InvoiceStatus.APPLIED,
      remark: d.remark,
    } as Invoice);
    return this.invoiceRepo.save(invoice as any);
  }
  async issueInvoice(tenantId: number, id: number) {
    const inv = await this.invoiceRepo.findOne({ where: { tenantId, id } as any });
    if (!inv) throw new NotFoundException('发票不存在');
    if (inv.status !== InvoiceStatus.APPLIED) throw new BusinessException(ResCode.BAD_REQUEST, '仅待开具发票可开具');
    inv.status = InvoiceStatus.ISSUED;
    inv.invoiceNo = `E${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
    inv.issuedAt = new Date();
    return this.invoiceRepo.save(inv as any);
  }
  async listInvoices(tenantId: number, q: InvoicePageQueryDto) {
    const where: any = { tenantId };
    if (q.orderId) where.orderId = q.orderId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.invoiceRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }
  async getInvoice(tenantId: number, id: number) {
    const inv = await this.invoiceRepo.findOne({ where: { tenantId, id } as any });
    if (!inv) throw new NotFoundException('发票不存在');
    return inv;
  }

  // ---------------- 财务报表汇总 ----------------
  async summary(tenantId: number, q: FinanceSummaryQueryDto) {
    const from = q.from ? new Date(q.from) : new Date(0);
    const to = q.to ? new Date(q.to) : new Date();

    const paidIncome = await this.sumPayment(tenantId, from, to, 'SUCCESS');
    const refunded = await this.sumRefund(tenantId, from, to);
    const netIncome = r2(paidIncome - refunded);

    const consumptionHours = await this.sumConsumeHours(tenantId, from, to);
    const splitExpense = await this.sumSplit(tenantId, from, to, SplitType.TEACHER_COMMISSION);
    const consumedValue = await this.sumSplitBase(tenantId, from, to);
    const salaryPayable = await this.sumSalary(tenantId, from, to);
    const profit = r2(netIncome - splitExpense - salaryPayable);

    const orderCount = await this.countOrders(tenantId, from, to);
    const refundsCount = await this.countRefunds(tenantId, from, to);

    return {
      from, to,
      paidIncome: r2(paidIncome),
      refunded: r2(refunded),
      netIncome,
      consumptionHours,
      consumedValue: r2(consumedValue),
      splitExpense: r2(splitExpense),
      salaryPayable: r2(salaryPayable),
      profit,
      orderCount,
      refundsCount,
    };
  }

  private async sumPayment(tenantId: number, from: Date, to: Date, status: string) {
    const res = await this.splitRepo.manager.getRepository('payment').createQueryBuilder('p')
      .where('p.tenant_id = :t', { t: tenantId })
      .andWhere('p.status = :s', { s: status })
      .andWhere('p.paid_at BETWEEN :from AND :to', { from, to })
      .select('SUM(p.amount)', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async sumRefund(tenantId: number, from: Date, to: Date) {
    const res = await this.splitRepo.manager.getRepository('refund').createQueryBuilder('r')
      .where('r.tenant_id = :t', { t: tenantId })
      .andWhere("r.status = 'REFUNDED'")
      .andWhere('r.approved_at BETWEEN :from AND :to', { from, to })
      .select('SUM(r.amount)', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async sumConsumeHours(tenantId: number, from: Date, to: Date) {
    const res = await this.consRepo.createQueryBuilder('c')
      .where('c.tenant_id = :t', { t: tenantId })
      .andWhere("c.type = 'CONSUME'")
      .andWhere('c.created_at BETWEEN :from AND :to', { from, to })
      .select('SUM(ABS(c.hours))', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async sumSplit(tenantId: number, from: Date, to: Date, type: SplitType) {
    const res = await this.splitRepo.createQueryBuilder('s')
      .where('s.tenant_id = :t', { t: tenantId })
      .andWhere('s.type = :type', { type })
      .andWhere('s.created_at BETWEEN :from AND :to', { from, to })
      .select('SUM(s.amount)', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async sumSplitBase(tenantId: number, from: Date, to: Date) {
    const res = await this.splitRepo.createQueryBuilder('s')
      .where('s.tenant_id = :t', { t: tenantId })
      .andWhere('s.created_at BETWEEN :from AND :to', { from, to })
      .select('SUM(s.base_amount)', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async sumSalary(tenantId: number, from: Date, to: Date) {
    const res = await this.salaryRepo.createQueryBuilder('s')
      .where('s.tenant_id = :t', { t: tenantId })
      .andWhere("s.status IN ('CONFIRMED','PAID')")
      .andWhere('s.created_at BETWEEN :from AND :to', { from, to })
      .select('SUM(s.total)', 's').getRawOne();
    return Number(res?.s || 0);
  }
  private async countOrders(tenantId: number, from: Date, to: Date) {
    return this.splitRepo.manager.getRepository('orders').createQueryBuilder('o')
      .where('o.tenant_id = :t', { t: tenantId })
      .andWhere('o.created_at BETWEEN :from AND :to', { from, to })
      .getCount();
  }
  private async countRefunds(tenantId: number, from: Date, to: Date) {
    return this.splitRepo.manager.getRepository('refund').createQueryBuilder('r')
      .where('r.tenant_id = :t', { t: tenantId })
      .andWhere("r.status = 'REFUNDED'")
      .andWhere('r.approved_at BETWEEN :from AND :to', { from, to })
      .getCount();
  }
}
