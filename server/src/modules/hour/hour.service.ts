import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, EntityTarget, In, IsNull, Repository } from 'typeorm';
import { orgRepo } from '../../common/org-scope';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { HourAccount } from './entities/hour-account.entity';
import { HourConsumption } from './entities/hour-consumption.entity';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Lesson, LessonStatus } from '../../modules/course/entities/lesson.entity';
import { GrantHourDto, HourAccountPageQueryDto, HourConsumptionPageQueryDto, ScheduleMakeupDto } from './dto/hour.dto';
import { FinanceService } from '../../modules/finance/finance.service';
import { TaskService } from '../../modules/task/task.service';
import { PackageCourse } from '../../modules/course-package/entities/package-course.entity';

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

  /** 发放课时：落到学员指定课程/课包账户（不存在则创建）。packageId 区分课包账户 */
  async grant(
    tenantId: number,
    p: {
      studentId: number;
      courseId?: number;
      packageId?: number;
      type: HourAccount['type'];
      hours: number;
      operatorId?: number;
      refOrderId?: number;
      remark?: string;
      unitValue?: number;
    },
  ) {
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, HourAccount);
      let acc: HourAccount | null = await repo.findOne({
        where: {
          tenantId,
          studentId: p.studentId,
          courseId: p.courseId ?? null,
          packageId: p.packageId ?? null,
        } as any,
      });
      if (!acc) {
        acc = repo.create({
          tenantId,
          studentId: p.studentId,
          courseId: p.courseId,
          packageId: p.packageId,
          type: p.type,
          balance: 0,
          frozen: 0,
          totalGranted: 0,
        } as HourAccount);
      }
      acc.balance += p.hours;
      acc.totalGranted += p.hours;
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

  /**
   * 解析消课账户（文档 §4.6 课包跨课程抵扣）：
   * 优先使用"课程专属账户"；不足时回退到"覆盖该课程的课包账户"。
   */
  private async resolveConsumeAccount(
    tenantId: number,
    studentId: number,
    courseId: number | undefined,
    hours: number,
  ): Promise<HourAccount | null> {
    const repo = this.$r(this.ds, HourAccount);
    const courseAcc = await repo.findOne({
      where: { tenantId, studentId, courseId: courseId ?? null, packageId: IsNull() } as any,
    });
    if (courseAcc && courseAcc.balance >= hours) return courseAcc;

    if (courseId) {
      const pkgCourses = await this.$r(this.ds, PackageCourse).find({
        where: { tenantId, courseId } as any,
      });
      const pkgIds = pkgCourses.map((p) => Number(p.packageId));
      if (pkgIds.length) {
        const pkgAccs = await repo.find({
          where: { tenantId, studentId, courseId: IsNull(), packageId: In(pkgIds) } as any,
        });
        const usable = pkgAccs
          .filter((a) => (a.balance || 0) >= hours)
          .sort((a, b) => (b.balance || 0) - (a.balance || 0));
        if (usable.length) return usable[0];
      }
    }
    return courseAcc || null;
  }

  /** 消课：从学员课程/课包账户扣减（强一致 + 审计 + 课包跨课程抵扣） */
  async consume(
    tenantId: number,
    p: { studentId: number; courseId?: number; lessonId?: number; hours: number; operatorId?: number },
  ) {
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, HourAccount);
      const acc = await this.resolveConsumeAccount(tenantId, p.studentId, p.courseId, p.hours);
      if (!acc || acc.balance < p.hours) {
        throw new BusinessException(ResCode.BAD_REQUEST, '学员课时不足，无法消课');
      }
      acc.balance -= p.hours;
      await repo.save(acc as any);
      const ledger = this.$r(m, HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: p.studentId,
        courseId: p.courseId,
        packageId: acc.packageId,
        lessonId: p.lessonId,
        type: 'CONSUME',
        hours: -p.hours,
        operatorId: p.operatorId,
        remark: '点名消课',
      } as any);
      await this.$r(m, HourConsumption).save(ledger as any);
      return acc;
    });
  }

  /** 退费回滚：移除该订单发放的全部课时（防止资损），余额不为负 */
  async rollbackByOrder(tenantId: number, orderId: number, operatorId?: number) {
    const grants = await this.$r(this.ds, HourConsumption).find({
      where: { tenantId, type: 'GRANT', refOrderId: orderId } as any,
      order: { id: 'ASC' } as any,
    });
    for (const g of grants) {
      await this.ds.transaction(async (m) => {
        const repo = this.$r(m, HourAccount);
        const acc = await repo.findOne({ where: { tenantId, id: g.accountId } as any });
        if (!acc) return;
        const deduct = Math.min(acc.balance, g.hours);
        acc.balance -= deduct;
        await repo.save(acc as any);
        const ledger = this.$r(m, HourConsumption).create({
          tenantId,
          accountId: acc.id,
          studentId: g.studentId,
          courseId: g.courseId,
          type: 'ROLLBACK',
          hours: -deduct,
          refOrderId: orderId,
          operatorId,
          remark: '退费回滚',
        } as any);
        await this.$r(m, HourConsumption).save(ledger as any);
      });
    }
    return { rolledBack: grants.length };
  }

  /** 课时账户列表 */
  async listAccounts(tenantId: number, q: HourAccountPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.courseId) where.courseId = q.courseId;
    if (q.type) where.type = q.type;
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

  /** 课时流水 */
  async listConsumptions(tenantId: number, q: HourConsumptionPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.accountId) where.accountId = q.accountId;
    if (q.type) where.type = q.type;
    const [list, total] = await this.$r(this.ds, HourConsumption).findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 点名消课：根据课次课程，对出勤/补课学员扣减 1 课时 */
  async attendLesson(tenantId: number, lessonId: number, records: { studentId: number; status: AttendanceStatus }[], operatorId?: number) {
    const lesson = await this.$r(this.ds, Lesson).findOne({
      where: { tenantId, id: lessonId } as any,
    });
    if (!lesson) throw new BusinessException(ResCode.NOT_FOUND, '课次不存在');
    const result: Attendance[] = [];
    for (const r of records) {
      // 已消课的重复点名不再重复触发分账/任务
      const prev = await this.$r(this.ds, Attendance).findOne({
        where: { tenantId, lessonId, studentId: r.studentId } as any,
      });
      const alreadyConsumed = prev && (prev.status === 'PRESENT' || prev.status === 'MAKEUP') && prev.hours > 0;

      let consumedHours = 0;
      let ledgerId: number | undefined;
      const att = await this.ds.transaction(async (m) => {
        const attRepo = this.$r(m, Attendance);
        const existing = await attRepo.findOne({
          where: { tenantId, lessonId, studentId: r.studentId } as any,
        });
        const att = (existing || attRepo.create({ tenantId, lessonId, studentId: r.studentId } as any)) as Attendance;
        att.status = r.status;
        let hours = 0;
        if (r.status === 'PRESENT' || r.status === 'MAKEUP') {
          const acc = await this.resolveConsumeAccount(tenantId, r.studentId, lesson.courseId, 1);
          if (acc && acc.balance >= 1) {
            acc.balance -= 1;
            await this.$r(m, HourAccount).save(acc as any);
            const ledger = this.$r(m, HourConsumption).create({
              tenantId,
              accountId: acc.id,
              studentId: r.studentId,
              courseId: lesson.courseId,
              packageId: acc.packageId,
              lessonId,
              type: 'CONSUME',
              hours: -1,
              operatorId,
              remark: '点名消课',
            } as any);
            const saved = (await this.$r(m, HourConsumption).save(ledger as any)) as HourConsumption;
            ledgerId = saved.id;
            hours = 1;
          }
        }
        att.hours = hours;
        att.operatorId = operatorId;
        consumedHours = hours;
        return (await attRepo.save(att as any)) as Attendance;
      });

      // 消课事件钩子：触发分账 + 课后点评任务（§4.5/§4.6/§4.26）。
      // 即发即弃：钩子为衍生数据（最终一致），避免在请求内 await 导致驱动连接争用。
      if (consumedHours > 0 && !alreadyConsumed) {
        void this.financeSvc.onConsume(tenantId, {
          studentId: r.studentId,
          courseId: lesson.courseId,
          teacherId: lesson.teacherId,
          lessonId,
          consumptionId: ledgerId,
          hours: consumedHours,
        }).catch(() => undefined);
        if (lesson.teacherId) {
          void this.taskSvc.create(tenantId, {
            type: 'AFTER_CLASS_REVIEW',
            title: `课后点评：课次#${lessonId}`,
            assigneeId: lesson.teacherId,
            refType: 'LESSON',
            refId: lessonId,
            dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          }).catch(() => undefined);
        }
      }
      result.push(att);
    }
    return result;
  }

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
      status: LessonStatus.SCHEDULED,
      type: 'MAKEUP',
    } as Lesson);
    const saved = (await this.$r(this.ds, Lesson).save(lesson as any)) as Lesson;
    // 预占一条考勤(补课待上)，点名时按 MAKEUP 消课
    await this.$r(this.ds, Attendance).save(this.$r(this.ds, Attendance).create({
      tenantId,
      lessonId: saved.id,
      studentId: d.studentId,
      status: 'MAKEUP',
      hours: 0,
    } as any));
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

  /** 手动发放/校正课时（管理端） */
  async grantManual(tenantId: number, d: GrantHourDto, operatorId?: number) {
    return this.grant(tenantId, {
      studentId: d.studentId,
      courseId: d.courseId,
      type: d.type || (d.courseId ? 'CLASS' : 'GENERAL'),
      hours: d.hours,
      operatorId,
      remark: d.remark || '手动发放',
    });
  }
}
