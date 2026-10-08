import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { HourAccount } from './entities/hour-account.entity';
import { HourConsumption } from './entities/hour-consumption.entity';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { Lesson } from '../../modules/course/entities/lesson.entity';
import { GrantHourDto, HourAccountPageQueryDto, HourConsumptionPageQueryDto } from './dto/hour.dto';

@Injectable()
export class HourService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** 发放课时：落到学员指定课程账户（不存在则创建） */
  async grant(
    tenantId: number,
    p: {
      studentId: number;
      courseId?: number;
      type: HourAccount['type'];
      hours: number;
      operatorId?: number;
      refOrderId?: number;
      remark?: string;
    },
  ) {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(HourAccount);
      let acc: HourAccount | null = await repo.findOne({
        where: { tenantId, studentId: p.studentId, courseId: p.courseId ?? null } as any,
      });
      if (!acc) {
        acc = repo.create({
          tenantId,
          studentId: p.studentId,
          courseId: p.courseId,
          type: p.type,
          balance: 0,
          frozen: 0,
          totalGranted: 0,
        } as HourAccount);
      }
      acc.balance += p.hours;
      acc.totalGranted += p.hours;
      await repo.save(acc as any);

      const ledger = m.getRepository(HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: p.studentId,
        courseId: p.courseId,
        type: 'GRANT',
        hours: p.hours,
        refOrderId: p.refOrderId,
        operatorId: p.operatorId,
        remark: p.remark || '订单支付发放',
      } as any);
      await m.getRepository(HourConsumption).save(ledger as any);
      return acc;
    });
  }

  /** 消课：从学员指定课程账户扣减（强一致 + 审计） */
  async consume(
    tenantId: number,
    p: { studentId: number; courseId?: number; lessonId?: number; hours: number; operatorId?: number },
  ) {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(HourAccount);
      const acc = await repo.findOne({
        where: { tenantId, studentId: p.studentId, courseId: p.courseId ?? null } as any,
      });
      if (!acc || acc.balance < p.hours) {
        throw new BusinessException(ResCode.BAD_REQUEST, '学员课时不足，无法消课');
      }
      acc.balance -= p.hours;
      await repo.save(acc as any);
      const ledger = m.getRepository(HourConsumption).create({
        tenantId,
        accountId: acc.id,
        studentId: p.studentId,
        courseId: p.courseId,
        lessonId: p.lessonId,
        type: 'CONSUME',
        hours: -p.hours,
        operatorId: p.operatorId,
        remark: '点名消课',
      } as any);
      await m.getRepository(HourConsumption).save(ledger as any);
      return acc;
    });
  }

  /** 退费回滚：移除该订单发放的全部课时（防止资损），余额不为负 */
  async rollbackByOrder(tenantId: number, orderId: number, operatorId?: number) {
    const grants = await this.ds.getRepository(HourConsumption).find({
      where: { tenantId, type: 'GRANT', refOrderId: orderId } as any,
      order: { id: 'ASC' } as any,
    });
    for (const g of grants) {
      await this.ds.transaction(async (m) => {
        const repo = m.getRepository(HourAccount);
        const acc = await repo.findOne({ where: { tenantId, id: g.accountId } as any });
        if (!acc) return;
        const deduct = Math.min(acc.balance, g.hours);
        acc.balance -= deduct;
        await repo.save(acc as any);
        const ledger = m.getRepository(HourConsumption).create({
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
        await m.getRepository(HourConsumption).save(ledger as any);
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
    const [list, total] = await this.ds.getRepository(HourAccount).findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 学员课时余额（按课程聚合） */
  async balance(tenantId: number, studentId: number) {
    return this.ds.getRepository(HourAccount).find({
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
    const [list, total] = await this.ds.getRepository(HourConsumption).findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 点名消课：根据课次课程，对出勤/补课学员扣减 1 课时 */
  async attendLesson(tenantId: number, lessonId: number, records: { studentId: number; status: AttendanceStatus }[], operatorId?: number) {
    const lesson = await this.ds.getRepository(Lesson).findOne({
      where: { tenantId, id: lessonId } as any,
    });
    if (!lesson) throw new BusinessException(ResCode.NOT_FOUND, '课次不存在');
    const result: Attendance[] = [];
    for (const r of records) {
      const att = await this.ds.transaction(async (m) => {
        const attRepo = m.getRepository(Attendance);
        const existing = await attRepo.findOne({
          where: { tenantId, lessonId, studentId: r.studentId } as any,
        });
        const att = (existing || attRepo.create({ tenantId, lessonId, studentId: r.studentId } as any)) as Attendance;
        att.status = r.status;
        let hours = 0;
        if (r.status === 'PRESENT' || r.status === 'MAKEUP') {
          const acc = await m.getRepository(HourAccount).findOne({
            where: { tenantId, studentId: r.studentId, courseId: lesson.courseId } as any,
          });
          if (acc && acc.balance >= 1) {
            acc.balance -= 1;
            await m.getRepository(HourAccount).save(acc as any);
            const ledger = m.getRepository(HourConsumption).create({
              tenantId,
              accountId: acc.id,
              studentId: r.studentId,
              courseId: lesson.courseId,
              lessonId,
              type: 'CONSUME',
              hours: -1,
              operatorId,
              remark: '点名消课',
            } as any);
            await m.getRepository(HourConsumption).save(ledger as any);
            hours = 1;
          }
        }
        att.hours = hours;
        att.operatorId = operatorId;
        return (await attRepo.save(att as any)) as Attendance;
      });
      result.push(att);
    }
    return result;
  }

  /** 请假：记考勤(不消课) */
  async leaveLesson(tenantId: number, lessonId: number, studentId: number, operatorId?: number) {
    const attRepo = this.ds.getRepository(Attendance);
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
