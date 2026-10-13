import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, EntityTarget, LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { orgRepo } from '../../common/org-scope';
import { calcLateJoin } from '../../common/late-join';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { HourAccount, HourGrantType } from './entities/hour-account.entity';
import { HourConsumption, ConfirmStatus } from './entities/hour-consumption.entity';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Entitlement } from './entities/entitlement.entity';
import { Enrollment, JoinType } from './entities/enrollment.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { PackageCourse } from '../course-package/entities/package-course.entity';
import { PackageItem } from '../course-package/entities/package-item.entity';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import {
  GrantHourDto, HourAccountPageQueryDto, HourConsumptionPageQueryDto, ScheduleMakeupDto,
} from './dto/hour.dto';
import { FinanceService } from '../finance/finance.service';
import { TaskService } from '../task/task.service';

export type ConsumeMode = 'BY_HOUR' | 'BY_TIME' | 'BY_PERIOD';

export interface GrantParams {
  studentId: number;
  courseId?: number;
  packageId?: number;
  type?: HourAccount['type'];
  hours: number;
  operatorId?: number;
  refOrderId?: number;
  orderItemId?: number;
  remark?: string;
  unitValue?: number;
  /** 有效期天数（优先于 expireAt） */
  validDays?: number;
  expireAt?: Date;
  /** 发放来源：付费/赠送/转班/回滚。GIFT 会落到独立赠课账户（优先消耗、退费不计入） */
  grantType?: HourGrantType;
}

/** 消课计划：一次消课可能跨多个账户（如专属账户余额不足时回退课包账户） */
interface ConsumePlanItem {
  account: HourAccount;
  hours: number;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class HourService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly financeSvc: FinanceService,
    private readonly taskSvc: TaskService,
  ) {}

  /** 取仓库并套用校区隔离（与 BaseService 语义一致：读过滤 / 写落章） */
  private $r<E extends Object>(m: DataSource | EntityManager, e: EntityTarget<E>): Repository<E> {
    return orgRepo(m.getRepository<E>(e)) as Repository<E>;
  }

  // ---------------------------------------------------------------- 发放

  /**
   * 发放课时：落到学员指定课程/课包账户（不存在则创建）。
   * - packageId 区分课包账户；isGranted 区分赠课账户（独立成户，优先消耗且退费不计入）
   * - validDays/expireAt 落地有效期（此前 valid_days 是死配置，从不写入）
   * - unitValue 落地到账户，退费与分账直接取用（不再回查流水）
   */
  async grant(tenantId: number, p: GrantParams) {
    const isGranted = p.grantType === 'GIFT';
    const expireAt = p.expireAt ?? (p.validDays && p.validDays > 0 ? addDays(new Date(), p.validDays) : undefined);
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, HourAccount);
      let acc: HourAccount | null = await repo.findOne({
        where: {
          tenantId,
          studentId: p.studentId,
          courseId: p.courseId ?? null,
          packageId: p.packageId ?? null,
          isGranted,
        } as any,
      });
      if (!acc) {
        acc = repo.create({
          tenantId,
          studentId: p.studentId,
          courseId: p.courseId,
          packageId: p.packageId,
          type: p.type || (p.courseId ? 'CLASS' : 'GENERAL'),
          balance: 0,
          frozen: 0,
          totalGranted: 0,
          isGranted,
          grantType: p.grantType || 'PAID',
          status: 'ACTIVE',
          startAt: new Date(),
          unitValue: p.unitValue ?? 0,
          orderItemId: p.orderItemId,
        } as HourAccount);
      }
      acc.balance += p.hours;
      acc.totalGranted += p.hours;
      if (expireAt) acc.expireAt = expireAt;
      if (p.unitValue != null) acc.unitValue = p.unitValue;
      if (p.orderItemId) acc.orderItemId = p.orderItemId;
      await repo.save(acc as any);

      const ledger = this.$r(m, HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: p.studentId,
        courseId: p.courseId,
        packageId: p.packageId,
        type: 'GRANT',
        hours: p.hours,
        refOrderId: p.refOrderId,
        unitValue: p.unitValue ?? 0,
        operatorId: p.operatorId,
        remark: p.remark || '订单支付发放',
      } as any);
      await this.$r(m, HourConsumption).save(ledger as any);
      return acc;
    });
  }

  /** 时间型权益发放（BY_TIME：年卡/月卡/托班时段卡，有效期内不限次） */
  async grantEntitlement(
    tenantId: number,
    p: {
      studentId: number;
      packageId?: number;
      courseId?: number;
      startAt?: Date;
      expireAt: Date;
      refOrderId?: number;
      operatorId?: number;
      remark?: string;
    },
  ) {
    const repo = this.$r(this.ds, Entitlement);
    const e = repo.create({
      tenantId,
      studentId: p.studentId,
      packageId: p.packageId,
      courseId: p.courseId,
      startAt: p.startAt || new Date(),
      expireAt: p.expireAt,
      status: 'ACTIVE',
      refOrderId: p.refOrderId,
    } as any);
    return repo.save(e as any);
  }

  /** 期课报名（BY_PERIOD：绑定班期，按课次出勤，不逐次建课时账户；支持插班折减） */
  async enroll(
    tenantId: number,
    p: {
      studentId: number;
      classGroupId?: number;
      courseId?: number;
      packageId?: number;
      joinType?: JoinType;
      discountHours?: number;
      discountAmount?: number;
      totalLessons?: number;
      /** 插班：报名时班期已上过的课次（配合 tuition 自动折算学费） */
      finishedLessons?: number;
      /** 插班：全程学费（用于按剩余课次折减） */
      tuition?: number;
      refOrderId?: number;
    },
  ) {
    const repo = this.$r(this.ds, Enrollment);

    // 插班自动折减：按已过课次折算学费，可上课次相应减少（§2.3 #12）
    let totalLessons = Number(p.totalLessons) || 0;
    let discountHours = Number(p.discountHours) || 0;
    let discountAmount = Number(p.discountAmount) || 0;
    if (p.joinType === 'LATE' && (p.finishedLessons || 0) > 0) {
      const c = calcLateJoin({
        totalLessons,
        finishedLessons: Number(p.finishedLessons) || 0,
        tuition: Number(p.tuition) || 0,
      });
      discountHours = c.discountHours;
      discountAmount = c.discountAmount;
      totalLessons = c.remainLessons; // 该生实际可上课次
    }
    const e = repo.create({
      tenantId,
      studentId: p.studentId,
      classGroupId: p.classGroupId,
      courseId: p.courseId,
      packageId: p.packageId,
      joinedAt: new Date(),
      joinType: p.joinType || 'FULL',
      discountHours,
      discountAmount,
      totalLessons,
      attendedLessons: 0,
      status: 'ACTIVE',
      refOrderId: p.refOrderId,
    } as any);
    return repo.save(e as any);
  }

  /** 插班折减试算：按剩余课次折减学费（§2.3 #12） */
  previewLateJoin(d: { totalLessons: number; finishedLessons: number; tuition: number }) {
    return calcLateJoin(d);
  }

  // ---------------------------------------------------------------- 消耗模式解析

  /**
   * 解析该学员本次上课适用哪种消耗模式（文档 §1/§3.2）：
   * 1) BY_PERIOD 期课：存在生效的班期报名 → 只记出勤，不扣课时
   * 2) BY_TIME   权益：存在有效期内的时间型权益 → 只记出勤，不扣课时（不限次）
   * 3) BY_HOUR   课时：其余情况按课时扣减
   */
  async resolveMode(
    tenantId: number,
    studentId: number,
    courseId?: number,
    classGroupId?: number,
  ): Promise<{ mode: ConsumeMode; entitlementId?: number; enrollmentId?: number }> {
    const now = new Date();

    const enrolls = await this.$r(this.ds, Enrollment).find({
      where: { tenantId, studentId, status: 'ACTIVE' } as any,
    });
    const enroll = enrolls.find((e) => {
      if (classGroupId != null && e.classGroupId != null) {
        return Number(e.classGroupId) === Number(classGroupId);
      }
      return courseId != null && e.courseId != null && Number(e.courseId) === Number(courseId);
    });
    if (enroll) return { mode: 'BY_PERIOD', enrollmentId: enroll.id };

    const ents = await this.$r(this.ds, Entitlement).find({
      where: { tenantId, studentId, status: 'ACTIVE' } as any,
    });
    const ent = ents.find((e) => {
      const startOk = !e.startAt || new Date(e.startAt).getTime() <= now.getTime();
      const endOk = new Date(e.expireAt).getTime() >= now.getTime();
      const courseOk = e.courseId == null || (courseId != null && Number(e.courseId) === Number(courseId));
      return startOk && endOk && courseOk;
    });
    if (ent) return { mode: 'BY_TIME', entitlementId: ent.id };

    return { mode: 'BY_HOUR' };
  }

  // ---------------------------------------------------------------- 账户选择与原子扣减

  /** 覆盖该课程的课包 ID 集合：package_course / package_item / 通用包(ALL_COURSE) */
  private async eligiblePackageIds(tenantId: number, courseId?: number): Promise<Set<number>> {
    const ids = new Set<number>();
    if (courseId != null) {
      const pcs = await this.$r(this.ds, PackageCourse).find({ where: { tenantId, courseId } as any });
      pcs.forEach((p) => ids.add(Number(p.packageId)));
      const pis = await this.$r(this.ds, PackageItem).find({ where: { tenantId, courseId } as any });
      pis.forEach((p) => ids.add(Number(p.packageId)));
    }
    const allScope = await this.$r(this.ds, CoursePackage).find({ where: { tenantId, scopeType: 'ALL_COURSE' } as any });
    allScope.forEach((p) => ids.add(Number(p.id)));
    return ids;
  }

  /**
   * 消课账户优先级链（文档 §4.1）：
   * 1) 赠课账户优先（降低退费时的赠课纠纷）
   * 2) 有效期最近者优先 FIFO（防止旧课时沉淀）
   * 3) 课程专属账户优先于课包账户
   * 4) 课包账户（package_course / package_item / 通用包覆盖该课程）
   * 单个账户不足时**跨账户拆分**，保证"总额够就能上"。
   */
  private async pickAccounts(
    tenantId: number,
    studentId: number,
    courseId: number | undefined,
    hours: number,
  ): Promise<ConsumePlanItem[]> {
    const now = Date.now();
    const accs = await this.$r(this.ds, HourAccount).find({
      where: { tenantId, studentId, status: 'ACTIVE' } as any,
    });
    const usable = accs.filter(
      (a) => (a.balance || 0) > 0 && (!a.expireAt || new Date(a.expireAt).getTime() > now),
    );
    const pkgIds = await this.eligiblePackageIds(tenantId, courseId);

    const candidates = usable.filter((a) => {
      if (a.courseId != null) {
        return courseId != null && Number(a.courseId) === Number(courseId);
      }
      if (a.packageId != null) return pkgIds.has(Number(a.packageId));
      return false;
    });

    candidates.sort((a, b) => {
      const ga = a.isGranted ? 0 : 1;
      const gb = b.isGranted ? 0 : 1;
      if (ga !== gb) return ga - gb;
      const ea = a.expireAt ? new Date(a.expireAt).getTime() : Number.MAX_SAFE_INTEGER;
      const eb = b.expireAt ? new Date(b.expireAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (ea !== eb) return ea - eb;
      const pa = a.courseId != null ? 0 : 1;
      const pb = b.courseId != null ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return Number(a.id) - Number(b.id);
    });

    const plan: ConsumePlanItem[] = [];
    let need = hours;
    for (const a of candidates) {
      if (need <= 0) break;
      const take = Math.min(need, a.balance || 0);
      if (take <= 0) continue;
      plan.push({ account: a, hours: take });
      need -= take;
    }
    if (need > 0) {
      throw new BusinessException(ResCode.BAD_REQUEST, `学员课时不足，无法消课（还需 ${need} 课时）`);
    }
    return plan;
  }

  /** 原子扣减：条件更新保证并发下不会超扣（影响行数=0 表示余额不足或已被并发扣走） */
  private async deductAtomic(m: EntityManager, accountId: number, hours: number): Promise<boolean> {
    const res = await m
      .createQueryBuilder()
      .update(HourAccount)
      .set({ balance: () => `balance - ${Math.floor(hours)}` })
      .where('id = :id', { id: accountId })
      .andWhere('balance >= :h', { h: hours })
      .execute();
    return (res.affected || 0) > 0;
  }

  // ---------------------------------------------------------------- 消课

  /** 消课：自动识别消耗模式；BY_HOUR 时按优先级链扣减（可跨账户拆分） */
  async consume(
    tenantId: number,
    p: {
      studentId: number;
      courseId?: number;
      lessonId?: number;
      classGroupId?: number;
      hours: number;
      operatorId?: number;
    },
  ) {
    const resolved = await this.resolveMode(tenantId, p.studentId, p.courseId, p.classGroupId);
    if (resolved.mode !== 'BY_HOUR') {
      // 年卡/期课：只记出勤，不扣课时
      return {
        mode: resolved.mode,
        consumed: 0,
        entitlementId: resolved.entitlementId,
        enrollmentId: resolved.enrollmentId,
        accounts: [] as { accountId: number; hours: number; ledgerId?: number }[],
      };
    }
    return this.ds.transaction(async (m) => {
      const plan = await this.pickAccounts(tenantId, p.studentId, p.courseId, p.hours);
      const accounts: { accountId: number; hours: number; ledgerId?: number }[] = [];
      for (const item of plan) {
        const ok = await this.deductAtomic(m, Number(item.account.id), item.hours);
        if (!ok) throw new BusinessException(ResCode.BAD_REQUEST, '课时账户并发变更，请重试');
        const saved: any = await this.$r(m, HourConsumption).save(
          this.$r(m, HourConsumption).create({
            tenantId,
            accountId: item.account.id,
            studentId: p.studentId,
            courseId: p.courseId,
            packageId: item.account.packageId,
            lessonId: p.lessonId,
            type: 'CONSUME',
            hours: -item.hours,
            unitValue: item.account.unitValue ?? 0,
            operatorId: p.operatorId,
            confirmStatus: 'PENDING',
            remark: '点名消课',
          } as any) as any,
        );
        accounts.push({ accountId: Number(item.account.id), hours: item.hours, ledgerId: saved.id });
      }
      return { mode: 'BY_HOUR' as ConsumeMode, consumed: p.hours, accounts };
    });
  }

  /** 点名消课：按课次课程对出勤/补课学员结算（年卡/期课只记出勤） */
  async attendLesson(
    tenantId: number,
    lessonId: number,
    records: { studentId: number; status: AttendanceStatus }[],
    operatorId?: number,
  ) {
    const lesson = await this.$r(this.ds, Lesson).findOne({ where: { tenantId, id: lessonId } as any });
    if (!lesson) throw new BusinessException(ResCode.NOT_FOUND, '课次不存在');
    const result: Attendance[] = [];

    for (const r of records) {
      const consumed: { accountId: number; hours: number; ledgerId?: number }[] = [];
      let mode: ConsumeMode = 'BY_HOUR';

      let att: Attendance;
      try {
        att = await this.ds.transaction(async (m) => {
          const attRepo = this.$r(m, Attendance);
          const existing = await attRepo.findOne({
            where: { tenantId, lessonId, studentId: r.studentId } as any,
          });
          // 幂等：已消课的重复点名直接返回，不重复扣课时/不重复分账
          if (existing && existing.hours > 0 && (existing.status === 'PRESENT' || existing.status === 'MAKEUP')) {
            return existing;
          }

          const resolved = await this.resolveMode(
            tenantId,
            r.studentId,
            lesson.courseId,
            (lesson as any).classGroupId,
          );
          mode = resolved.mode;

          let hours = 0;
          if (r.status === 'PRESENT' || r.status === 'MAKEUP') {
            if (resolved.mode !== 'BY_HOUR') {
              hours = 0; // BY_TIME / BY_PERIOD：只记出勤
              // 期课：累计已出勤课次（退费按"已上/总课次"口径计算）
              if (resolved.mode === 'BY_PERIOD' && resolved.enrollmentId) {
                await m
                  .createQueryBuilder()
                  .update(Enrollment)
                  .set({ attendedLessons: () => 'attended_lessons + 1' })
                  .where('id = :id', { id: resolved.enrollmentId })
                  .execute();
              }
            } else {
              const plan = await this.pickAccounts(tenantId, r.studentId, lesson.courseId, 1);
              for (const item of plan) {
                const ok = await this.deductAtomic(m, Number(item.account.id), item.hours);
                if (!ok) throw new BusinessException(ResCode.BAD_REQUEST, '课时账户并发变更，请重试');
                const saved: any = await this.$r(m, HourConsumption).save(
                  this.$r(m, HourConsumption).create({
                    tenantId,
                    accountId: item.account.id,
                    studentId: r.studentId,
                    courseId: lesson.courseId,
                    packageId: item.account.packageId,
                    lessonId,
                    type: 'CONSUME',
                    hours: -item.hours,
                    unitValue: item.account.unitValue ?? 0,
                    operatorId,
                    confirmStatus: 'PENDING',
                    remark: '点名消课',
                  } as any) as any,
                );
                consumed.push({ accountId: Number(item.account.id), hours: item.hours, ledgerId: saved.id });
                hours += item.hours;
              }
            }
          }

          const target = (existing ||
            attRepo.create({ tenantId, lessonId, studentId: r.studentId } as any)) as Attendance;
          target.status = r.status;
          target.hours = hours;
          target.consumeMode = resolved.mode;
          target.operatorId = operatorId;
          const savedAtt = (await attRepo.save(target as any)) as Attendance;
          // 回填考勤 ID 到流水，便于一课一消对账
          for (const c of consumed) {
            if (!c.ledgerId) continue;
            await m
              .createQueryBuilder()
              .update(HourConsumption)
              .set({ attendanceId: savedAtt.id })
              .where('id = :id', { id: c.ledgerId })
              .execute();
          }
          return savedAtt;
        });
      } catch (e: any) {
        // 并发重复点名：唯一约束兜底，返回既有记录，绝不重复消课
        const code = String(e?.code || '');
        const msg = String(e?.message || '');
        if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT' || msg.includes('UNIQUE')) {
          const existing = await this.$r(this.ds, Attendance).findOne({
            where: { tenantId, lessonId, studentId: r.studentId } as any,
          });
          if (existing) {
            result.push(existing);
            continue;
          }
        }
        throw e;
      }

      // 消课事件钩子：分账 + 课后点评任务（即发即弃，最终一致）
      if (consumed.length && mode === 'BY_HOUR') {
        for (const c of consumed) {
          void this.financeSvc
            .onConsume(tenantId, {
              studentId: r.studentId,
              courseId: lesson.courseId,
              teacherId: (lesson as any).teacherId,
              lessonId,
              consumptionId: c.ledgerId,
              accountId: c.accountId,
              hours: c.hours,
            })
            .catch(() => undefined);
        }
        if ((lesson as any).teacherId) {
          void this.taskSvc
            .create(tenantId, {
              type: 'AFTER_CLASS_REVIEW',
              title: `课后点评：课次#${lessonId}`,
              assigneeId: (lesson as any).teacherId,
              refType: 'LESSON',
              refId: lessonId,
              dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            })
            .catch(() => undefined);
        }
      }
      result.push(att);
    }
    return result;
  }

  // ---------------------------------------------------------------- 退费回滚

  /**
   * 退费回滚：移除该订单发放的课时（防资损）。
   * - ratio：部分退费时按比例回滚，避免"只退部分钱却清零全部课时"
   * - 赠课账户不回滚（赠课不退、不计入可退金额）
   * - 单事务执行，避免中途失败留下半截
   */
  async rollbackByOrder(tenantId: number, orderId: number, ratio = 1, operatorId?: number) {
    const grants = await this.$r(this.ds, HourConsumption).find({
      where: { tenantId, type: 'GRANT', refOrderId: orderId } as any,
      order: { id: 'ASC' } as any,
    });
    let rolledBack = 0;
    await this.ds.transaction(async (m) => {
      for (const g of grants) {
        const repo = this.$r(m, HourAccount);
        const acc = await repo.findOne({ where: { tenantId, id: g.accountId } as any });
        if (!acc || acc.isGranted) continue;
        const target = Math.ceil((Math.abs(g.hours) || 0) * ratio);
        const deduct = Math.min(acc.balance || 0, target);
        if (deduct <= 0) continue;
        acc.balance = (acc.balance || 0) - deduct;
        await repo.save(acc as any);
        await this.$r(m, HourConsumption).save(
          this.$r(m, HourConsumption).create({
            tenantId,
            accountId: acc.id,
            studentId: g.studentId,
            courseId: g.courseId,
            packageId: g.packageId,
            type: 'ROLLBACK',
            hours: -deduct,
            refOrderId: orderId,
            operatorId,
            remark: '退费回滚',
          } as any),
        );
        rolledBack += deduct;
      }
    });
    return { rolledBack };
  }

  // ---------------------------------------------------------------- 生命周期：过期 / 停课 / 结课 / 延期

  /** 到期定时任务：有效期到期 → EXPIRE 流水 + 余额清零（文档 §4.2） */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpireCron() {
    const rows = await this.ds
      .getRepository(HourAccount)
      .createQueryBuilder('a')
      .select('DISTINCT a.tenant_id', 'tenantId')
      .getRawMany();
    for (const row of rows) {
      await this.expireTenant(Number(row.tenantId)).catch(() => undefined);
    }
  }

  async expireTenant(tenantId: number) {
    const now = new Date();
    // 条件下推到 SQL：只取已到期且有余额的账户，避免"全表加载后 JS 过滤"的内存尖峰
    const expired = (await this.$r(this.ds, HourAccount).find({
      where: { tenantId, status: 'ACTIVE', expireAt: LessThanOrEqual(now) } as any,
    })).filter((a) => (a.balance || 0) > 0);
    for (const a of expired) {
      await this.ds.transaction(async (m) => {
        const repo = this.$r(m, HourAccount);
        const acc = await repo.findOne({ where: { tenantId, id: a.id } as any });
        if (!acc || (acc.balance || 0) <= 0) return;
        const remain = acc.balance || 0;
        acc.balance = 0;
        acc.status = 'EXPIRED';
        await repo.save(acc as any);
        await this.$r(m, HourConsumption).save(
          this.$r(m, HourConsumption).create({
            tenantId,
            accountId: acc.id,
            studentId: acc.studentId,
            courseId: acc.courseId,
            packageId: acc.packageId,
            type: 'EXPIRE',
            hours: -remain,
            remark: '有效期到期，剩余课时清零',
          } as any),
        );
      });
    }
    // 时间型权益到期（同样条件下推）
    const expiredEnts = await this.$r(this.ds, Entitlement).find({
      where: { tenantId, status: 'ACTIVE', expireAt: LessThanOrEqual(now) } as any,
    });
    for (const e of expiredEnts) {
      e.status = 'EXPIRED';
      await this.$r(this.ds, Entitlement).save(e as any);
    }
    return { expiredAccounts: expired.length, expiredEntitlements: expiredEnts.length };
  }

  /** 停课/冻结：保留剩余课时与学费（区别于结课） */
  async freezeAccount(tenantId: number, accountId: number, operatorId?: number) {
    const repo = this.$r(this.ds, HourAccount);
    const acc = await repo.findOne({ where: { tenantId, id: accountId } as any });
    if (!acc) throw new BusinessException(ResCode.NOT_FOUND, '课时账户不存在');
    acc.status = 'FROZEN';
    acc.frozen = acc.balance || 0;
    await repo.save(acc as any);
    await this.$r(this.ds, HourConsumption).save(
      this.$r(this.ds, HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: acc.studentId,
        courseId: acc.courseId,
        packageId: acc.packageId,
        type: 'FREEZE',
        hours: 0,
        operatorId,
        remark: '停课冻结（保留剩余课时）',
      } as any),
    );
    return acc;
  }

  /** 复课：解冻恢复可用 */
  async unfreezeAccount(tenantId: number, accountId: number, operatorId?: number) {
    const repo = this.$r(this.ds, HourAccount);
    const acc = await repo.findOne({ where: { tenantId, id: accountId } as any });
    if (!acc) throw new BusinessException(ResCode.NOT_FOUND, '课时账户不存在');
    acc.status = 'ACTIVE';
    acc.frozen = 0;
    await repo.save(acc as any);
    await this.$r(this.ds, HourConsumption).save(
      this.$r(this.ds, HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: acc.studentId,
        courseId: acc.courseId,
        packageId: acc.packageId,
        type: 'FREEZE',
        hours: 0,
        operatorId,
        remark: '复课解冻',
      } as any),
    );
    return acc;
  }

  /** 取单个课时账户 */
  async getAccount(tenantId: number, accountId: number) {
    const acc = await this.$r(this.ds, HourAccount).findOne({
      where: { tenantId, id: accountId } as any,
    });
    if (!acc) throw new BusinessException(ResCode.NOT_FOUND, '课时账户不存在');
    return acc;
  }

  /** 结课/转出：清空剩余课时（学费转机构手续费）——与停课的财务口径差异 */
  async closeAccount(tenantId: number, accountId: number, operatorId?: number, remark?: string) {
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, HourAccount);
      const acc = await repo.findOne({ where: { tenantId, id: accountId } as any });
      if (!acc) throw new BusinessException(ResCode.NOT_FOUND, '课时账户不存在');
      const remain = acc.balance || 0;
      acc.balance = 0;
      acc.status = 'CLOSED';
      await repo.save(acc as any);
      await this.$r(m, HourConsumption).save(
        this.$r(m, HourConsumption).create({
          tenantId,
          accountId: acc.id,
          studentId: acc.studentId,
          courseId: acc.courseId,
          packageId: acc.packageId,
          type: 'EXPIRE',
          hours: -remain,
          operatorId,
          remark: remark || '结课清空剩余课时（学费转机构手续费）',
        } as any),
      );
      return acc;
    });
  }

  /** 延期申请（口头承诺落到书面，示范合同要求） */
  async extendExpiry(tenantId: number, accountId: number, days: number, operatorId?: number) {
    const repo = this.$r(this.ds, HourAccount);
    const acc = await repo.findOne({ where: { tenantId, id: accountId } as any });
    if (!acc) throw new BusinessException(ResCode.NOT_FOUND, '课时账户不存在');
    const base = acc.expireAt && new Date(acc.expireAt).getTime() > Date.now() ? new Date(acc.expireAt) : new Date();
    acc.expireAt = addDays(base, days);
    if (acc.status === 'EXPIRED') acc.status = 'ACTIVE';
    await repo.save(acc as any);
    return acc;
  }

  /** 临近到期清单（家长端 + 顾问端提醒，文档 §5.2 #10） */
  async listExpiring(tenantId: number, days = 7) {
    const now = Date.now();
    const until = now + days * 86400_000;
    const accs = await this.$r(this.ds, HourAccount).find({ where: { tenantId, status: 'ACTIVE' } as any });
    return accs.filter((a) => {
      if (!a.expireAt) return false;
      const t = new Date(a.expireAt).getTime();
      return t > now && t <= until && (a.balance || 0) > 0;
    });
  }

  // ---------------------------------------------------------------- 一课一消：家长确认

  /** 家长确认消课（一课一消：经家长确认后监管方才划拨该课时款项） */
  async confirmConsumption(tenantId: number, consumptionId: number, status: ConfirmStatus) {
    const repo = this.$r(this.ds, HourConsumption);
    const c = await repo.findOne({ where: { tenantId, id: consumptionId } as any });
    if (!c) throw new BusinessException(ResCode.NOT_FOUND, '消课流水不存在');
    c.confirmStatus = status;
    c.confirmAt = new Date();
    return repo.save(c as any);
  }

  // ---------------------------------------------------------------- 查询

  async listAccounts(tenantId: number, q: HourAccountPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.courseId) where.courseId = q.courseId;
    if (q.type) where.type = q.type;
    if ((q as any).status) where.status = (q as any).status;
    const [list, total] = await this.$r(this.ds, HourAccount).findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 学员课时余额（按课程聚合） */
  async balance(tenantId: number, studentId: number) {
    return this.$r(this.ds, HourAccount).find({
      where: { tenantId, studentId } as any,
      order: { id: 'ASC' } as any,
    });
  }

  async listConsumptions(tenantId: number, q: HourConsumptionPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.accountId) where.accountId = q.accountId;
    if (q.type) where.type = q.type;
    if ((q as any).confirmStatus) where.confirmStatus = (q as any).confirmStatus;
    const [list, total] = await this.$r(this.ds, HourConsumption).findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async listEntitlements(tenantId: number, studentId?: number) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.$r(this.ds, Entitlement).find({ where, order: { id: 'DESC' } as any });
  }

  async listEnrollments(tenantId: number, studentId?: number) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.$r(this.ds, Enrollment).find({ where, order: { id: 'DESC' } as any });
  }

  // ---------------------------------------------------------------- 补课 / 请假 / 手动发放

  /** 补课排课（§4.6 请假补课）：为学员创建一节补课，点名时占用可用课时 */
  async scheduleMakeup(tenantId: number, d: ScheduleMakeupDto) {
    if (!d.studentId) throw new BusinessException(ResCode.BAD_REQUEST, '补课需指定学员');
    const lesson = this.$r(this.ds, Lesson).create({
      tenantId,
      classGroupId: d.classGroupId ?? 0,
      courseId: d.courseId,
      teacherId: d.teacherId,
      startTime: new Date(d.startTime),
      endTime: new Date(d.endTime),
      status: 'SCHEDULED' as any,
      type: 'MAKEUP',
    } as Lesson);
    const saved = (await this.$r(this.ds, Lesson).save(lesson as any)) as Lesson;
    await this.$r(this.ds, Attendance).save(
      this.$r(this.ds, Attendance).create({
        tenantId,
        lessonId: saved.id,
        studentId: d.studentId,
        status: 'MAKEUP',
        hours: 0,
      } as any),
    );
    return saved;
  }

  /** 请假：记考勤(不消课) */
  async leaveLesson(tenantId: number, lessonId: number, studentId: number, operatorId?: number) {
    const attRepo = this.$r(this.ds, Attendance);
    const existing = await attRepo.findOne({ where: { tenantId, lessonId, studentId } as any });
    const att = (existing || attRepo.create({ tenantId, lessonId, studentId } as any)) as Attendance;
    att.status = 'LEAVE';
    att.hours = 0;
    att.operatorId = operatorId;
    return attRepo.save(att as any);
  }

  /** 手动发放/校正课时（管理端）；grantType=GIFT 即赠课 */
  async grantManual(tenantId: number, d: GrantHourDto, operatorId?: number) {
    return this.grant(tenantId, {
      studentId: d.studentId,
      courseId: d.courseId,
      type: d.type || (d.courseId ? 'CLASS' : 'GENERAL'),
      hours: d.hours,
      operatorId,
      remark: d.remark || '手动发放',
      validDays: (d as any).validDays,
      grantType: (d as any).grantType || 'PAID',
      unitValue: (d as any).unitValue,
    });
  }
}
