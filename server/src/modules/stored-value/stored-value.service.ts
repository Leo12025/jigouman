import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, EntityTarget, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { orgRepo } from '../../common/org-scope';
import { resolveLimits, checkCompliance, assertComplianceConfirmable } from '../../common/compliance';
import { ApprovalService } from '../approval/approval.service';
import { approvalEvents, ApprovalEventPayload } from '../../common/approval-events';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { StoredValueAccount } from './entities/stored-value-account.entity';
import { StoredValueLedger } from './entities/stored-value-ledger.entity';
import {
  StoredValueRequest,
  StoredValueRequestType,
  StoredValueRequestStatus,
} from './entities/stored-value-request.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

/** 储值资金操作审批 bizType（与调课/转班/套餐升级/退费统一走审批中心） */
export const SV_RECHARGE_BIZ_TYPE = 'STORED_VALUE_RECHARGE';
export const SV_REFUND_BIZ_TYPE = 'STORED_VALUE_REFUND';
import {
  RechargeDto, ConsumeDto, RefundToStoredValueDto,
  StoredValueAccountPageQueryDto, StoredValueLedgerPageQueryDto,
} from './dto/stored-value.dto';

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class StoredValueService implements OnModuleInit {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(StoredValueAccount) accRepoRaw: Repository<StoredValueAccount>,
    @InjectRepository(StoredValueLedger) ledgerRepoRaw: Repository<StoredValueLedger>,
    @InjectRepository(StoredValueRequest) reqRepoRaw: Repository<StoredValueRequest>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly approvalSvc: ApprovalService,
  ) {
    this.accRepo = orgRepo(accRepoRaw);
    this.ledgerRepo = orgRepo(ledgerRepoRaw);
    this.reqRepo = orgRepo(reqRepoRaw);
  }

  private readonly accRepo: Repository<StoredValueAccount>;
  private readonly ledgerRepo: Repository<StoredValueLedger>;
  private readonly reqRepo: Repository<StoredValueRequest>;

  onModuleInit() {
    approvalEvents.on('approval.approved', (p: ApprovalEventPayload) => {
      if (p.bizType === SV_RECHARGE_BIZ_TYPE || p.bizType === SV_REFUND_BIZ_TYPE) {
        void this.applyRequest(p.tenantId, p.bizId).catch(() => undefined);
      }
    });
    approvalEvents.on('approval.rejected', (p: ApprovalEventPayload) => {
      if (p.bizType === SV_RECHARGE_BIZ_TYPE || p.bizType === SV_REFUND_BIZ_TYPE) {
        void this.rejectRequest(p.tenantId, p.bizId).catch(() => undefined);
      }
    });
  }

  private $r<E extends Object>(m: DataSource | EntityManager, e: EntityTarget<E>): Repository<E> {
    return orgRepo(m.getRepository<E>(e)) as Repository<E>;
  }

  /** 生效阈值：储值同样受"以充值形式变相收取"监管（§0） */
  async limits(tenantId: number) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } as any });
    return resolveLimits(t?.config);
  }

  private async getOrCreate(
    m: EntityManager,
    tenantId: number,
    studentId: number,
  ): Promise<StoredValueAccount> {
    const repo = this.$r(m, StoredValueAccount);
    let acc = await repo.findOne({ where: { tenantId, studentId } as any });
    if (!acc) {
      acc = (repo.create({
        tenantId,
        studentId,
        balance: 0,
        giftBalance: 0,
        totalRecharged: 0,
        totalGift: 0,
        totalUsed: 0,
        status: 'ACTIVE',
      } as any) as unknown) as StoredValueAccount;
      acc = (await repo.save(acc as any)) as unknown as StoredValueAccount;
    }
    return acc;
  }

  /** 储值充值（含预存赠送：充 5000 送 500） */
  async recharge(tenantId: number, d: RechargeDto, operatorId?: number) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '充值金额必须大于 0');

    // 合规：储值属预收费，金额上限同样适用（超出二次确认可继续）
    const limits = await this.limits(tenantId);
    assertComplianceConfirmable(
      checkCompliance(limits, { amount }),
      d.confirmCompliance,
      '储值充值超出预收费监管上限',
    );

    const gift = r2(Number(d.giftAmount) || 0);
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, StoredValueAccount);
      const acc = await this.getOrCreate(m, tenantId, Number(d.studentId));
      acc.balance = r2(Number(acc.balance) + amount + gift);
      acc.giftBalance = r2(Number(acc.giftBalance) + gift);
      acc.totalRecharged = r2(Number(acc.totalRecharged) + amount);
      acc.totalGift = r2(Number(acc.totalGift) + gift);
      if (d.expireAt) acc.expireAt = new Date(d.expireAt);
      const saved = (await repo.save(acc as any)) as StoredValueAccount;

      const ledgerRepo = this.$r(m, StoredValueLedger);
      await ledgerRepo.save(
        ledgerRepo.create({
          tenantId,
          accountId: saved.id,
          studentId: saved.studentId,
          type: 'RECHARGE',
          amount,
          giftAmount: 0,
          balanceAfter: saved.balance,
          refOrderId: d.refOrderId,
          operatorId,
          remark: d.remark || '储值充值',
        } as any),
      );
      if (gift > 0) {
        await ledgerRepo.save(
          ledgerRepo.create({
            tenantId,
            accountId: saved.id,
            studentId: saved.studentId,
            type: 'GIFT',
            amount: gift,
            giftAmount: gift,
            balanceAfter: saved.balance,
            refOrderId: d.refOrderId,
            operatorId,
            remark: '预存赠送',
          } as any),
        );
      }
      return { account: saved, recharged: amount, gift };
    });
  }

  /** 储值消费：优先扣赠送部分（与赠课优先消耗口径一致），原子扣减防超扣 */
  async consume(tenantId: number, d: ConsumeDto, operatorId?: number) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '消费金额必须大于 0');
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, StoredValueAccount);
      const acc = await repo.findOne({ where: { tenantId, studentId: d.studentId } as any });
      if (!acc || acc.status !== 'ACTIVE') {
        throw new BusinessException(ResCode.BAD_REQUEST, '储值账户不可用');
      }
      const bal = Number(acc.balance) || 0;
      if (bal < amount) {
        throw new BusinessException(
          ResCode.BAD_REQUEST,
          `储值余额不足（可用 ${bal} 元，需 ${amount} 元）`,
        );
      }
      const giftDeduct = Math.min(Number(acc.giftBalance) || 0, amount);
      const res = await m
        .createQueryBuilder()
        .update(StoredValueAccount)
        .set({
          balance: () => `balance - ${amount}`,
          giftBalance: () => `gift_balance - ${giftDeduct}`,
          totalUsed: () => `total_used + ${amount}`,
        })
        .where('id = :id', { id: acc.id })
        .andWhere('balance >= :a', { a: amount })
        .execute();
      if (!(res.affected || 0)) {
        throw new BusinessException(ResCode.BAD_REQUEST, '储值余额不足或并发变更，请重试');
      }
      const after = r2(bal - amount);
      const ledgerRepo = this.$r(m, StoredValueLedger);
      await ledgerRepo.save(
        ledgerRepo.create({
          tenantId,
          accountId: acc.id,
          studentId: d.studentId,
          type: 'CONSUME',
          amount: -amount,
          giftAmount: -giftDeduct,
          balanceAfter: after,
          refOrderId: d.refOrderId,
          operatorId,
          remark: d.remark || '储值消费',
        } as any),
      );
      return { accountId: acc.id, consumed: amount, balanceAfter: after };
    });
  }

  /** 退费退回储值：仅退本金，赠送部分不退 */
  async refundToStoredValue(tenantId: number, d: RefundToStoredValueDto, operatorId?: number) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '退回金额必须大于 0');
    return this.ds.transaction(async (m) => {
      const repo = this.$r(m, StoredValueAccount);
      const acc = await this.getOrCreate(m, tenantId, Number(d.studentId));
      acc.balance = r2(Number(acc.balance) + amount);
      const saved = (await repo.save(acc as any)) as StoredValueAccount;
      const ledgerRepo = this.$r(m, StoredValueLedger);
      await ledgerRepo.save(
        ledgerRepo.create({
          tenantId,
          accountId: saved.id,
          studentId: saved.studentId,
          type: 'REFUND',
          amount,
          giftAmount: 0,
          balanceAfter: saved.balance,
          refOrderId: d.refOrderId,
          operatorId,
          remark: d.remark || '退费退回储值（赠送部分不退）',
        } as any),
      );
      return { account: saved, refunded: amount };
    });
  }

  // ---------------- 审批中心资金联动（§4.16/§9.5） ----------------
  // 充值/退回储值均先落请求(PENDING)并进入审批中心；审批通过后事件总线回写余额，驳回不改余额。

  /** 发起储值充值申请：不立即变更余额，进入审批中心 */
  async requestRecharge(tenantId: number, d: RechargeDto, applicant: AuthUser) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '充值金额必须大于 0');
    const limits = await this.limits(tenantId);
    assertComplianceConfirmable(
      checkCompliance(limits, { amount }),
      d.confirmCompliance,
      '储值充值超出预收费监管上限',
    );
    const req = this.reqRepo.create({
      tenantId,
      type: StoredValueRequestType.RECHARGE,
      studentId: Number(d.studentId),
      amount,
      giftAmount: r2(Number(d.giftAmount) || 0),
      remark: d.remark || '储值充值',
      refOrderId: d.refOrderId,
      operatorId: applicant.id,
      status: StoredValueRequestStatus.PENDING,
    } as StoredValueRequest);
    const saved = (await this.reqRepo.save(req as any)) as StoredValueRequest;
    const inst = await this.approvalSvc.createByBizType(tenantId, {
      bizType: SV_RECHARGE_BIZ_TYPE,
      bizId: saved.id,
      title: `储值充值申请-学员${d.studentId}-${amount}元`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.reqRepo.save(saved as any);
    return saved;
  }

  /** 发起退费退回储值申请：不立即变更余额，进入审批中心 */
  async requestRefund(tenantId: number, d: RefundToStoredValueDto, applicant: AuthUser) {
    const amount = r2(Number(d.amount));
    if (amount <= 0) throw new BusinessException(ResCode.BAD_REQUEST, '退回金额必须大于 0');
    const req = this.reqRepo.create({
      tenantId,
      type: StoredValueRequestType.REFUND,
      studentId: Number(d.studentId),
      amount,
      giftAmount: 0,
      remark: d.remark || '退费退回储值（赠送部分不退）',
      refOrderId: d.refOrderId,
      operatorId: applicant.id,
      status: StoredValueRequestStatus.PENDING,
    } as StoredValueRequest);
    const saved = (await this.reqRepo.save(req as any)) as StoredValueRequest;
    const inst = await this.approvalSvc.createByBizType(tenantId, {
      bizType: SV_REFUND_BIZ_TYPE,
      bizId: saved.id,
      title: `退回储值申请-学员${d.studentId}-${amount}元`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.reqRepo.save(saved as any);
    return saved;
  }

  /** 审批通过：执行真实余额变更（充值/退回储值） */
  private async applyRequest(tenantId: number, id?: number) {
    if (!id) return;
    const req = await this.reqRepo.findOne({ where: { tenantId, id } as any });
    if (!req || req.status !== StoredValueRequestStatus.PENDING) return;
    if (req.type === StoredValueRequestType.RECHARGE) {
      await this.recharge(
        tenantId,
        {
          studentId: req.studentId,
          amount: Number(req.amount),
          giftAmount: Number(req.giftAmount),
          remark: req.remark,
          refOrderId: req.refOrderId,
          confirmCompliance: true,
        } as RechargeDto,
        req.operatorId,
      );
    } else {
      await this.refundToStoredValue(
        tenantId,
        {
          studentId: req.studentId,
          amount: Number(req.amount),
          remark: req.remark,
          refOrderId: req.refOrderId,
        } as RefundToStoredValueDto,
        req.operatorId,
      );
    }
    req.status = StoredValueRequestStatus.DONE;
    req.executedAt = new Date();
    await this.reqRepo.save(req as any);
  }

  /** 审批驳回：余额保持不变 */
  private async rejectRequest(tenantId: number, id?: number) {
    if (!id) return;
    const req = await this.reqRepo.findOne({ where: { tenantId, id } as any });
    if (!req || req.status !== StoredValueRequestStatus.PENDING) return;
    req.status = StoredValueRequestStatus.REJECTED;
    await this.reqRepo.save(req as any);
  }

  async listRequests(tenantId: number, q: any) {
    const where: any = { tenantId };
    if (q?.type) where.type = q.type;
    if (q?.status) where.status = q.status;
    if (q?.studentId) where.studentId = q.studentId;
    const page = q?.page || 1;
    const size = q?.size || 20;
    const [list, total] = await this.reqRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async balance(tenantId: number, studentId: number) {
    const acc = await this.accRepo.findOne({ where: { tenantId, studentId } as any });
    if (!acc) {
      return { studentId, balance: 0, giftBalance: 0, status: 'ACTIVE', exists: false };
    }
    return {
      studentId,
      balance: Number(acc.balance),
      giftBalance: Number(acc.giftBalance),
      totalRecharged: Number(acc.totalRecharged),
      totalGift: Number(acc.totalGift),
      totalUsed: Number(acc.totalUsed),
      status: acc.status,
      exists: true,
    };
  }

  async listAccounts(tenantId: number, q: StoredValueAccountPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.accRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async listLedgers(tenantId: number, q: StoredValueLedgerPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.accountId) where.accountId = q.accountId;
    if (q.type) where.type = q.type;
    const [list, total] = await this.ledgerRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }
}
