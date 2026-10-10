import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { StudentService } from './student.service';
import { Lead } from '../lead/entities/lead.entity';
import { LeadFollow } from '../lead/entities/lead-follow.entity';
import { TrialLesson } from '../lead/entities/trial.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { Refund } from '../order/entities/refund.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { HourConsumption } from '../hour/entities/hour-consumption.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';
import { CourseReview } from '../family/entities/course-review.entity';
import { Complaint } from '../complaint/entities/complaint.entity';
import { Score } from '../growth/entities/score.entity';
import { Member } from '../membership/entities/member.entity';
import { PointLedger } from '../membership/entities/point-ledger.entity';

/**
 * 学员全生命周期聚合（从线索到结课/退费的一站式视角）。
 * 通过 DataSource 在运行时获取各业务模块实体仓库，避免跨模块实体重复注册。
 */
@Injectable()
export class StudentLifecycleService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly studentSvc: StudentService,
  ) {}

  private repo<E>(e: new () => E) {
    return this.ds.getRepository(e);
  }

  async lifecycle(tenantId: number, studentId: number) {
    // 校验学员存在
    const student = await this.studentSvc.getStudent(tenantId, studentId);

    // 1) 线索 → 到店体验（试听）
    const lead = await this.repo(Lead).findOne({ where: { tenantId, convertedStudentId: studentId } as any });
    let follows: any[] = [];
    let trials: any[] = [];
    if (lead) {
      follows = await this.repo(LeadFollow).find({ where: { tenantId, leadId: lead.id } as any, order: { id: 'ASC' } as any });
      trials = await this.repo(TrialLesson).find({ where: { tenantId, leadId: lead.id } as any, order: { id: 'ASC' } as any });
    }

    // 2) 购课 / 续课（订单 + 订单项 + 退费）
    const orders = await this.repo(Order).find({ where: { tenantId, studentId } as any, order: { id: 'ASC' } as any });
    let items: any[] = [];
    if (orders.length) {
      items = await this.repo(OrderItem).find({ where: { tenantId, orderId: In(orders.map((o) => o.id)) } as any });
    }
    const refunds = await this.repo(Refund).find({ where: { tenantId, studentId } as any, order: { id: 'ASC' } as any });

    // 3) 上课（课时账户 + 消课流水）
    const accounts = await this.repo(HourAccount).find({ where: { tenantId, studentId } as any, order: { id: 'ASC' } as any });
    const consumptions = await this.repo(HourConsumption).find({ where: { tenantId, studentId } as any, order: { id: 'ASC' } as any });

    // 4) 服务（家校点评 / 作业 / 客诉 / 成绩）
    const reviews = await this.repo(CourseReview).find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any });
    const homework = await this.repo(HomeworkSubmit).find({ where: { tenantId, studentId } as any, order: { id: 'ASC' } as any });
    const complaints = await this.repo(Complaint).find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any });
    const scores = await this.repo(Score).find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any });

    // 5) 会员 / 积分
    const member = await this.repo(Member).findOne({ where: { tenantId, studentId } as any });
    let ledgers: any[] = [];
    if (member) ledgers = await this.repo(PointLedger).find({ where: { tenantId, studentId } as any, order: { id: 'DESC' } as any });

    // ---- 派生指标 ----
    const firstOrder = orders[0];
    const renewals = orders.slice(1);
    const totalPaid = orders.reduce((s, o) => s + (Number((o as any).paidAmount) || 0), 0);
    const totalRefunded = refunds
      .filter((r) => r.status === 'REFUNDED')
      .reduce((s, r) => s + (Number((r as any).amount) || 0), 0);
    const totalGranted = accounts.reduce((s, a) => s + (Number((a as any).totalGranted) || 0), 0);
    const totalBalance = accounts.reduce((s, a) => s + (Number((a as any).balance) || 0), 0);
    const consumed = consumptions
      .filter((c) => c.type === 'CONSUME')
      .reduce((s, c) => s + (Number((c as any).hours) || 0), 0);
    const refunded = refunds.some((r) => r.status === 'REFUNDING' || r.status === 'REFUNDED');
    // 结课：曾发放课时，且课时已全部消耗、且无退费
    const graduated = totalGranted > 0 && totalBalance <= 0 && !refunded;

    // ---- 统一时间线 ----
    const events: any[] = [];
    if (lead) events.push({ stage: 'lead', at: lead.createdAt, title: `线索录入（${lead.stage}）`, detail: lead.name });
    follows.forEach((f) => events.push({ stage: 'lead', at: f.createdAt, title: '跟进记录', detail: f.content }));
    trials.forEach((t) =>
      events.push({ stage: 'trial', at: (t as any).trialAt || t.createdAt, title: '到店试听', detail: (t as any).attended ? '已到店' : '未到店' }),
    );
    orders.forEach((o) =>
      events.push({ stage: 'purchase', at: o.createdAt, title: o.id === firstOrder?.id ? '首购' : '续课', detail: `订单${(o as any).orderNo} · ${(o as any).status}` }),
    );
    consumptions
      .filter((c) => c.type === 'CONSUME')
      .forEach((c) => events.push({ stage: 'class', at: c.createdAt, title: '上课消课', detail: `${(c as any).hours}h` }));
    reviews.forEach((r) => events.push({ stage: 'service', at: r.createdAt, title: '家校点评', detail: (r as any).content }));
    homework.forEach((h) => events.push({ stage: 'service', at: (h as any).submitAt || h.createdAt, title: '作业提交', detail: (h as any).status }));
    complaints.forEach((c) => events.push({ stage: 'service', at: c.createdAt, title: '客诉', detail: (c as any).title }));
    scores.forEach((s) => events.push({ stage: 'service', at: s.createdAt, title: '成绩录入', detail: String((s as any).score) }));
    refunds.forEach((r) => events.push({ stage: 'refund', at: r.createdAt, title: '退费', detail: `${r.status} · ${(r as any).amount}` }));
    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return {
      student,
      lead: lead ? { ...(lead as any), follows, trials } : null,
      purchase: { orders, items, refunds, firstOrder, renewals, totalPaid, totalRefunded },
      class: { accounts, consumptions, totalGranted, totalBalance, consumed },
      service: { reviews, homework, complaints, scores },
      membership: member ? { ...(member as any), ledgers } : null,
      summary: {
        hasLead: !!lead,
        orderCount: orders.length,
        renewalCount: renewals.length,
        graduated,
        refunded,
      },
      events,
    };
  }
}
