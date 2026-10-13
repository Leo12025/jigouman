import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, EntityTarget, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { orgRepo } from '../../common/org-scope';
import { resolveLimits, checkCompliance, assertComplianceConfirmable } from '../../common/compliance';
import { StoredValueAccount } from './entities/stored-value-account.entity';
import { StoredValueLedger } from './entities/stored-value-ledger.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import {
  RechargeDto, ConsumeDto, RefundToStoredValueDto,
  StoredValueAccountPageQueryDto, StoredValueLedgerPageQueryDto,
} from './dto/stored-value.dto';

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class StoredValueService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(StoredValueAccount) accRepoRaw: Repository<StoredValueAccount>,
    @InjectRepository(StoredValueLedger) ledgerRepoRaw: Repository<StoredValueLedger>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {
    this.accRepo = orgRepo(accRepoRaw);
    this.ledgerRepo = orgRepo(ledgerRepoRaw);
  }

  private readonly accRepo: Repository<StoredValueAccount>;
  private readonly ledgerRepo: Repository<StoredValueLedger>;

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
