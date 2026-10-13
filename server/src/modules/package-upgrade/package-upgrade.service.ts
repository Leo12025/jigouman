import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { orgRepo } from '../../common/org-scope';
import {
  parseTenantConfig, checkCompliance, checkHoursAmount, assertComplianceConfirmable,
} from '../../common/compliance';
import { approvalEvents, ApprovalEventPayload } from '../../common/approval-events';
import { orderEvents, OrderPaidPayload } from '../../common/order-events';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { PackageUpgrade } from './entities/package-upgrade.entity';
import { PreviewUpgradeDto, CreateUpgradeDto, PackageUpgradePageQueryDto } from './dto/package-upgrade.dto';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import { PackageTier } from '../course-package/entities/package-tier.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { HourService } from '../hour/hour.service';
import { CoursePackageService } from '../course-package/course-package.service';
import { OrderService } from '../order/order.service';
import { ApprovalService } from '../approval/approval.service';

export const UPGRADE_BIZ_TYPE = 'PACKAGE_UPGRADE';

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class PackageUpgradeService implements OnModuleInit {
  constructor(
    @InjectRepository(PackageUpgrade) private readonly upRepoRaw: Repository<PackageUpgrade>,
    @InjectRepository(CoursePackage) private readonly pkgRepoRaw: Repository<CoursePackage>,
    @InjectRepository(PackageTier) private readonly tierRepoRaw: Repository<PackageTier>,
    @InjectRepository(HourAccount) private readonly accRepoRaw: Repository<HourAccount>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Order) private readonly orderRepoRaw: Repository<Order>,
    private readonly hourSvc: HourService,
    private readonly pkgSvc: CoursePackageService,
    private readonly orderSvc: OrderService,
    private readonly approvalSvc: ApprovalService,
  ) {
    // 套用校区隔离：读自动过滤 org_id、写自动落 org_id 章
    this.upRepo = orgRepo(upRepoRaw);
    this.pkgRepo = orgRepo(pkgRepoRaw);
    this.tierRepo = orgRepo(tierRepoRaw);
    this.accRepo = orgRepo(accRepoRaw);
    this.orderRepo = orgRepo(orderRepoRaw);
  }

  private readonly upRepo: Repository<PackageUpgrade>;
  private readonly pkgRepo: Repository<CoursePackage>;
  private readonly tierRepo: Repository<PackageTier>;
  private readonly accRepo: Repository<HourAccount>;
  private readonly orderRepo: Repository<Order>;

  onModuleInit() {
    approvalEvents.on('approval.approved', (p: ApprovalEventPayload) => {
      if (p.bizType === UPGRADE_BIZ_TYPE) {
        void this.applyUpgradeEffect(p.tenantId, p.bizId).catch(() => undefined);
      }
    });
    approvalEvents.on('approval.rejected', (p: ApprovalEventPayload) => {
      if (p.bizType === UPGRADE_BIZ_TYPE) {
        void this.revertUpgrade(p.tenantId, p.bizId).catch(() => undefined);
      }
    });
    // 补款付清后，若升级单已批准则自动执行
    orderEvents.on('order.paid', (p: OrderPaidPayload) => {
      void this.onOrderPaid(p.tenantId, p.orderId).catch(() => undefined);
    });
  }

  // ---------------- 试算 ----------------

  /** 赠课参与折价的租户默认开关（tenants.config.upgradeIncludeGiftHours） */
  private async defaultIncludeGift(tenantId: number): Promise<boolean> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } as any });
    const cfg = parseTenantConfig(t?.config);
    return cfg.upgradeIncludeGiftHours === true;
  }

  private sameScope(a: HourAccount, from: HourAccount): boolean {
    if (from.courseId != null && a.courseId != null) {
      return Number(a.courseId) === Number(from.courseId);
    }
    if (from.packageId != null && a.packageId != null) {
      return Number(a.packageId) === Number(from.packageId);
    }
    return false;
  }

  /** 计算折价与应付差价（预览与创建共用） */
  private async calc(tenantId: number, d: PreviewUpgradeDto) {
    const acc = await this.hourSvc.getAccount(tenantId, Number(d.fromAccountId));
    if (Number(acc.studentId) !== Number(d.studentId)) {
      throw new BusinessException(ResCode.BAD_REQUEST, '课时账户不属于该学员');
    }
    if (acc.status !== 'ACTIVE') {
      throw new BusinessException(ResCode.BAD_REQUEST, '仅正常状态的课时账户可升级');
    }
    if (acc.isGranted) {
      throw new BusinessException(ResCode.BAD_REQUEST, '赠课账户不能作为升级来源');
    }

    const pkg = await this.pkgRepo.findOne({ where: { tenantId, id: Number(d.toPackageId) } as any });
    if (!pkg) throw new BusinessException(ResCode.NOT_FOUND, '目标套餐不存在');
    const tier = d.toTierId
      ? await this.tierRepo.findOne({
          where: { tenantId, id: Number(d.toTierId), packageId: pkg.id } as any,
        })
      : undefined;
    const targetHours = tier ? Number(tier.hours) : Number(pkg.totalHours);
    const targetAmount = tier ? Number(tier.price) : Number(pkg.price);

    const limits = await this.pkgSvc.limits(tenantId);
    // 目标套餐合规：课时/金额/时长跨度均为二次确认可继续
    assertComplianceConfirmable(
      checkCompliance(limits, {
        hours: targetHours,
        amount: targetAmount,
        validDays: pkg.validDays ?? undefined,
      }),
      d.confirmCompliance,
      '目标套餐超出预收费监管上限',
    );

    // 折价课时：原账户剩余付费课时（+可选赠课）
    const carryHours = Number(acc.balance) || 0;
    const includeGift = d.includeGift ?? (await this.defaultIncludeGift(tenantId));
    let giftHours = 0;
    const accs = await this.accRepo.find({
      where: { tenantId, studentId: d.studentId, status: 'ACTIVE' } as any,
    });
    if (includeGift) {
      giftHours = accs
        .filter((a) => a.isGranted && Number(a.id) !== Number(acc.id) && this.sameScope(a, acc))
        .reduce((s, a) => s + (Number(a.balance) || 0), 0);
    }

    const unitValue = Number(acc.unitValue) || 0;
    const deductAmount = r2((carryHours + giftHours) * unitValue);
    const payableAmount = Math.max(0, r2(targetAmount - deductAmount));

    // 补差价金额合规（一次性收取同样受 5000 元约束）——二次确认可继续
    assertComplianceConfirmable(
      checkHoursAmount(limits, { amount: payableAmount }),
      d.confirmCompliance,
      '补差价超出预收费监管上限',
    );

    // 升级后累计未消课时（排除即将折价清零的账户）
    const writeOffIds = new Set<number>([Number(acc.id)]);
    if (includeGift) {
      accs
        .filter((a) => a.isGranted && this.sameScope(a, acc))
        .forEach((a) => writeOffIds.add(Number(a.id)));
    }
    const restHours = accs
      .filter((a) => !writeOffIds.has(Number(a.id)))
      .reduce((s, a) => s + (Number(a.balance) || 0), 0);
    if (restHours + targetHours > limits.cumulativeHours) {
      assertComplianceConfirmable(
        [
          `升级后累计未消课时 ${restHours + targetHours} 超出监管上限 ${limits.cumulativeHours} 课时`,
        ],
        d.confirmCompliance,
        '超出预收费监管上限',
      );
    }

    return {
      acc, pkg, tier, carryHours, giftHours,
      includeGift: !!includeGift, unitValue, deductAmount,
      targetHours, targetAmount, payableAmount, limits,
    };
  }

  async previewUpgrade(tenantId: number, d: PreviewUpgradeDto) {
    const c = await this.calc(tenantId, d);
    return {
      studentId: d.studentId,
      fromAccountId: Number(c.acc.id),
      fromPackageId: c.acc.packageId ?? null,
      toPackageId: Number(c.pkg.id),
      toTierId: c.tier?.id ?? null,
      carryHours: c.carryHours,
      giftHours: c.giftHours,
      includeGift: c.includeGift,
      unitValue: r2(c.unitValue),
      deductAmount: c.deductAmount,
      targetHours: c.targetHours,
      targetAmount: r2(c.targetAmount),
      payableAmount: c.payableAmount,
    };
  }

  // ---------------- 创建与执行 ----------------

  /** 创建升级单：生成差价订单(UPGRADE) + 升级单 + 发起审批 */
  async createUpgrade(tenantId: number, d: CreateUpgradeDto, applicant: AuthUser) {
    const c = await this.calc(tenantId, d);

    const order: any = await this.orderSvc.createOrder(tenantId, {
      studentId: d.studentId,
      remark: d.remark,
      items: [
        {
          courseId: c.acc.courseId ?? 0,
          itemType: 'HOUR_PACK',
          packageId: Number(c.pkg.id),
          name: `套餐升级补差价：${c.pkg.name}`,
          qty: 1,
          unitPrice: c.payableAmount,
          // 差价订单不发课时；课时在升级执行时按目标套餐发放
          hours: 0,
        },
      ],
    } as any);

    // 标记为升级差价订单
    await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set({ orderType: 'UPGRADE' })
      .where('id = :id', { id: order.id })
      .execute();

    const up = this.upRepo.create({
      tenantId,
      studentId: d.studentId,
      fromAccountId: Number(c.acc.id),
      fromPackageId: c.acc.packageId,
      toPackageId: Number(c.pkg.id),
      toTierId: c.tier?.id,
      carryHours: c.carryHours,
      giftHours: c.giftHours,
      includeGift: c.includeGift,
      unitValue: c.unitValue,
      deductAmount: c.deductAmount,
      targetHours: c.targetHours,
      targetAmount: c.targetAmount,
      payableAmount: c.payableAmount,
      orderId: order.id,
      status: 'PENDING',
      remark: d.remark,
    } as any);
    const saved = (await this.upRepo.save(up as any)) as PackageUpgrade;

    const inst = await this.approvalSvc.createByBizType(tenantId, {
      bizType: UPGRADE_BIZ_TYPE,
      bizId: saved.id,
      title: `套餐升级-补差价${c.payableAmount}元`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.upRepo.save(saved as any);
    return saved;
  }

  private async isOrderPaid(tenantId: number, orderId: number): Promise<boolean> {
    const o = await this.orderRepo.findOne({ where: { tenantId, id: orderId } as any });
    return !!o && (o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED);
  }

  /**
   * 执行升级：
   * 1) 原账户剩余课时清零并置 CLOSED（折价已兑现，不重复计权益）
   * 2) 参与折价的赠课账户同样清零
   * 3) 按目标套餐 consume_mode 发放新课时（含有效期/单价/合规校验）
   */
  private async execute(tenantId: number, up: PackageUpgrade, operatorId?: number) {
    await this.hourSvc.closeAccount(
      tenantId,
      Number(up.fromAccountId),
      operatorId,
      '套餐升级：剩余课时折价转出',
    );

    if (up.includeGift) {
      const from = await this.accRepo.findOne({
        where: { tenantId, id: Number(up.fromAccountId) } as any,
      });
      const accs = await this.accRepo.find({
        where: { tenantId, studentId: up.studentId, status: 'ACTIVE' } as any,
      });
      for (const a of accs.filter((x) => x.isGranted && from && this.sameScope(x, from))) {
        await this.hourSvc.closeAccount(
          tenantId,
          Number(a.id),
          operatorId,
          '套餐升级：赠课折价转出',
        );
      }
    }

    await this.pkgSvc.purchase(
      tenantId,
      Number(up.toPackageId),
      {
        studentId: up.studentId,
        hours: Number(up.targetHours),
        tierId: up.toTierId,
        orderId: up.orderId,
      } as any,
      operatorId,
    );

    up.status = 'DONE';
    up.executedAt = new Date();
    await this.upRepo.save(up as any);
  }

  /** 审批通过：已补款付清则执行，否则置 APPROVED 等待付款 */
  async applyUpgradeEffect(tenantId: number, upgradeId?: number) {
    if (!upgradeId) return;
    const up = await this.upRepo.findOne({ where: { tenantId, id: upgradeId } as any });
    if (!up || up.status !== 'PENDING') return;
    const paid = up.orderId ? await this.isOrderPaid(tenantId, Number(up.orderId)) : false;
    if (!paid) {
      up.status = 'APPROVED';
      await this.upRepo.save(up as any);
      return;
    }
    await this.execute(tenantId, up);
  }

  /** 补款付清：若升级单已批准则执行 */
  async onOrderPaid(tenantId: number, orderId: number) {
    const up = await this.upRepo.findOne({ where: { tenantId, orderId } as any } as any);
    if (!up || up.status !== 'APPROVED') return;
    await this.execute(tenantId, up);
  }

  /** 审批驳回：升级单置 REJECTED，原账户与课时保持不动 */
  async revertUpgrade(tenantId: number, upgradeId?: number) {
    if (!upgradeId) return;
    const up = await this.upRepo.findOne({ where: { tenantId, id: upgradeId } as any });
    if (!up || up.status !== 'PENDING') return;
    up.status = 'REJECTED';
    await this.upRepo.save(up as any);
  }

  // ---------------- 查询 ----------------

  async list(tenantId: number, q: PackageUpgradePageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.upRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async get(tenantId: number, id: number) {
    const up = await this.upRepo.findOne({ where: { tenantId, id } as any });
    if (!up) throw new NotFoundException('升级单不存在');
    return up;
  }
}
