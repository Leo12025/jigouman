import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { resolveLimits, checkCompliance, ComplianceLimits } from '../../common/compliance';
import { CoursePackage } from './entities/course-package.entity';
import { PackageCourse } from './entities/package-course.entity';
import { PackageItem } from './entities/package-item.entity';
import { PackageTier } from './entities/package-tier.entity';
import { PackagePriceRule } from './entities/package-price-rule.entity';
import { Course } from '../course/entities/course.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import {
  CreateCoursePackageDto, UpdateCoursePackageDto, AddPackageCoursesDto,
  PurchasePackageDto, CoursePackagePageQueryDto, SetPackageTiersDto,
  SetPackageItemsDto, SetPackagePriceRulesDto,
} from './dto/course-package.dto';
import { HourService } from '../hour/hour.service';
import { orgRepo } from '../../common/org-scope';

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

@Injectable()
export class CoursePackageService {
  private readonly pkgRepo: Repository<CoursePackage>;
  private readonly pcRepo: Repository<PackageCourse>;
  private readonly itemRepo: Repository<PackageItem>;
  private readonly tierRepo: Repository<PackageTier>;
  private readonly ruleRepo: Repository<PackagePriceRule>;
  private readonly courseRepo: Repository<Course>;
  private readonly tenantRepo: Repository<Tenant>;

  constructor(
    @InjectRepository(CoursePackage) pkgRepo: Repository<CoursePackage>,
    @InjectRepository(PackageCourse) pcRepo: Repository<PackageCourse>,
    @InjectRepository(PackageItem) itemRepo: Repository<PackageItem>,
    @InjectRepository(PackageTier) tierRepo: Repository<PackageTier>,
    @InjectRepository(PackagePriceRule) ruleRepo: Repository<PackagePriceRule>,
    @InjectRepository(Course) courseRepo: Repository<Course>,
    @InjectRepository(Tenant) tenantRepo: Repository<Tenant>,
    private readonly hourSvc: HourService,
  ) {
    this.pkgRepo = orgRepo(pkgRepo);
    this.pcRepo = orgRepo(pcRepo);
    this.itemRepo = orgRepo(itemRepo);
    this.tierRepo = orgRepo(tierRepo);
    this.ruleRepo = orgRepo(ruleRepo);
    this.courseRepo = orgRepo(courseRepo);
    this.tenantRepo = tenantRepo;
  }

  // ---------------- 合规（§0 / §4.4） ----------------

  /** 生效阈值：租户配置 > 环境变量 > 内置最严口径 */
  async limits(tenantId: number): Promise<ComplianceLimits> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } as any });
    return resolveLimits(t?.config);
  }

  /** 超额阻断并提示（60 课时 / 5000 元 / 3 个月） */
  private async assertCompliance(
    tenantId: number,
    s: { hours?: number; amount?: number; validDays?: number },
  ) {
    const limits = await this.limits(tenantId);
    const errs = checkCompliance(limits, s);
    if (errs.length) {
      throw new BusinessException(ResCode.BAD_REQUEST, `超出预收费监管上限：${errs.join('；')}`);
    }
  }

  /** 学员维度累计未消课时（反"拆单绕过"：不能靠买两个 3000 的 30 课时包凑 60+） */
  async studentPendingHours(tenantId: number, studentId: number): Promise<number> {
    const accs = (await this.hourSvc.balance(tenantId, studentId)) as any[];
    return accs
      .filter((a) => a.status === 'ACTIVE' && !a.isGranted)
      .reduce((s, a) => s + (Number(a.balance) || 0), 0);
  }

  // ---------------- 套餐 CRUD ----------------

  async create(tenantId: number, d: CreateCoursePackageDto) {
    await this.assertCompliance(tenantId, {
      hours: d.totalHours,
      amount: d.price ?? d.listPrice,
      validDays: d.validDays,
    });
    const p = this.pkgRepo.create({
      tenantId,
      name: d.name,
      description: d.description,
      code: d.code,
      sellType: d.sellType || 'HOUR_PACK',
      consumeMode: d.consumeMode || 'BY_HOUR',
      scopeType: d.scopeType || 'SPECIFIED_COURSE',
      totalHours: d.totalHours,
      validDays: d.validDays,
      classGroupId: d.classGroupId,
      listPrice: d.listPrice ?? d.price,
      price: d.price,
      status: d.status ?? 1,
      remark: d.remark,
    } as CoursePackage);
    return this.pkgRepo.save(p as any);
  }

  async update(tenantId: number, id: number, d: UpdateCoursePackageDto) {
    const p = await this.pkgRepo.findOne({ where: { tenantId, id } as any });
    if (!p) throw new NotFoundException('课包不存在');
    const nextHours = d.totalHours ?? p.totalHours;
    const nextPrice = d.price ?? p.price;
    const nextDays = d.validDays !== undefined ? d.validDays : p.validDays;
    await this.assertCompliance(tenantId, {
      hours: nextHours,
      amount: nextPrice,
      validDays: nextDays ?? undefined,
    });
    Object.assign(p, {
      name: d.name ?? p.name,
      description: d.description ?? p.description,
      code: d.code ?? p.code,
      sellType: d.sellType ?? p.sellType,
      consumeMode: d.consumeMode ?? p.consumeMode,
      scopeType: d.scopeType ?? p.scopeType,
      totalHours: nextHours,
      validDays: nextDays,
      classGroupId: d.classGroupId ?? p.classGroupId,
      listPrice: d.listPrice ?? p.listPrice,
      price: nextPrice,
      status: d.status ?? p.status,
      remark: d.remark ?? p.remark,
    } as any);
    return this.pkgRepo.save(p as any);
  }

  async list(tenantId: number, q: CoursePackagePageQueryDto) {
    const where: any = { tenantId };
    if (q.status !== undefined) where.status = q.status;
    const [list, total] = await this.pkgRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async get(tenantId: number, id: number) {
    const p = await this.pkgRepo.findOne({ where: { tenantId, id } as any });
    if (!p) throw new NotFoundException('课包不存在');
    return p;
  }

  async remove(tenantId: number, id: number) {
    const p = await this.get(tenantId, Number(id));
    await this.pkgRepo.softDelete({ tenantId, id: p.id });
    await this.pcRepo.delete({ tenantId, packageId: p.id } as any);
    await this.itemRepo.delete({ tenantId, packageId: p.id } as any);
    await this.tierRepo.delete({ tenantId, packageId: p.id } as any);
    await this.ruleRepo.delete({ tenantId, packageId: p.id } as any);
    return { id: p.id };
  }

  // ---------------- 适用课程（通用包范围） ----------------

  async addCourses(tenantId: number, packageId: number, d: AddPackageCoursesDto) {
    await this.get(tenantId, Number(packageId));
    for (const courseId of d.courseIds) {
      const exists = await this.pcRepo.findOne({ where: { tenantId, packageId, courseId } as any });
      if (!exists) {
        await this.pcRepo.save(
          this.pcRepo.create({ tenantId, packageId, courseId } as PackageCourse) as any,
        );
      }
    }
    return this.courses(tenantId, Number(packageId));
  }

  async removeCourse(tenantId: number, packageId: number, courseId: number) {
    await this.pcRepo.delete({ tenantId, packageId, courseId } as any);
    return { packageId: Number(packageId), courseId: Number(courseId) };
  }

  async courses(tenantId: number, packageId: number) {
    const links = await this.pcRepo.find({ where: { tenantId, packageId } as any });
    if (!links.length) return [];
    const courses = await this.courseRepo.find({
      where: { tenantId, id: In(links.map((l) => l.courseId)) } as any,
    });
    return links.map((l) => ({
      courseId: l.courseId,
      name: courses.find((c) => Number(c.id) === Number(l.courseId))?.name,
    }));
  }

  // ---------------- 阶梯规格（§2.1 #3） ----------------

  async setTiers(tenantId: number, packageId: number, d: SetPackageTiersDto) {
    await this.get(tenantId, Number(packageId));
    const limits = await this.limits(tenantId);
    await this.tierRepo.delete({ tenantId, packageId } as any);
    const saved: PackageTier[] = [];
    let i = 0;
    for (const t of d.tiers) {
      const errs = checkCompliance(limits, { hours: t.hours, amount: t.price });
      if (errs.length) {
        throw new BusinessException(ResCode.BAD_REQUEST, `阶梯档位(${t.hours}课时)超出监管上限：${errs.join('；')}`);
      }
      saved.push(
        (await this.tierRepo.save(
          this.tierRepo.create({
            tenantId,
            packageId,
            hours: t.hours,
            price: t.price,
            sort: t.sort ?? i,
          } as PackageTier) as any,
        )) as PackageTier,
      );
      i += 1;
    }
    return saved;
  }

  async listTiers(tenantId: number, packageId: number) {
    return this.tierRepo.find({
      where: { tenantId, packageId } as any,
      order: { sort: 'ASC' } as any,
    });
  }

  // ---------------- 组合套餐子项（§2.1 #6） ----------------

  /**
   * 组合套餐：每个子项有各自固定课时数（hours 必填），各子项独立建账户，
   * Scratch 用完了不能拿 Python 的课时去补；通用包子项 hours 为空，只圈范围共用课时池。
   */
  async setItems(tenantId: number, packageId: number, d: SetPackageItemsDto) {
    const p = await this.get(tenantId, Number(packageId));
    const limits = await this.limits(tenantId);
    const total = d.items.reduce((s, i) => s + (Number(i.hours) || 0), 0);
    if (p.sellType === 'COMBO') {
      const missing = d.items.filter((i) => !i.hours);
      if (missing.length) {
        throw new BusinessException(ResCode.BAD_REQUEST, '组合套餐的每个子项必须指定各自课时数');
      }
      if (d.items.length && total !== Number(p.totalHours)) {
        p.totalHours = total;
        await this.pkgRepo.save(p as any);
      }
    }
    if (total > 0) {
      const errs = checkCompliance(limits, { hours: total });
      if (errs.length) {
        throw new BusinessException(ResCode.BAD_REQUEST, `组合套餐总课时超出监管上限：${errs.join('；')}`);
      }
    }
    await this.itemRepo.delete({ tenantId, packageId } as any);
    const saved: PackageItem[] = [];
    let seq = 0;
    for (const it of d.items) {
      // 组合套餐子项同时写入 package_course，保证通用查询与消课范围解析一致
      const exists = await this.pcRepo.findOne({
        where: { tenantId, packageId, courseId: it.courseId } as any,
      });
      if (!exists) {
        await this.pcRepo.save(
          this.pcRepo.create({ tenantId, packageId, courseId: it.courseId } as PackageCourse) as any,
        );
      }
      saved.push(
        (await this.itemRepo.save(
          this.itemRepo.create({
            tenantId,
            packageId,
            courseId: it.courseId,
            hours: it.hours,
            seq: it.seq ?? seq,
          } as PackageItem) as any,
        )) as PackageItem,
      );
      seq += 1;
    }
    return saved;
  }

  async listItems(tenantId: number, packageId: number) {
    const items = await this.itemRepo.find({
      where: { tenantId, packageId } as any,
      order: { seq: 'ASC' } as any,
    });
    if (!items.length) return [];
    const courses = await this.courseRepo.find({
      where: { tenantId, id: In(items.map((i) => i.courseId)) } as any,
    });
    return items.map((i) => ({
      courseId: i.courseId,
      hours: i.hours,
      seq: i.seq,
      name: courses.find((c) => Number(c.id) === Number(i.courseId))?.name,
    }));
  }

  // ---------------- 差异化定价（§2.1 #5 / §5.2 #12） ----------------

  async setPriceRules(tenantId: number, packageId: number, d: SetPackagePriceRulesDto) {
    await this.get(tenantId, Number(packageId));
    await this.ruleRepo.delete({ tenantId, packageId } as any);
    const saved: PackagePriceRule[] = [];
    for (const r of d.rules) {
      saved.push(
        (await this.ruleRepo.save(
          this.ruleRepo.create({
            tenantId,
            packageId,
            dimension: r.dimension,
            dimValue: r.dimValue,
            price: r.price,
          } as PackagePriceRule) as any,
        )) as PackagePriceRule,
      );
    }
    return saved;
  }

  async listPriceRules(tenantId: number, packageId: number) {
    return this.ruleRepo.find({ where: { tenantId, packageId } as any });
  }

  /** 按维度取价：命中校区/老师级别/班型规则则用规则价，否则用套餐售价 */
  async resolvePrice(
    tenantId: number,
    packageId: number,
    dims: { campusId?: number | string; teacherLevel?: string; classType?: string } = {},
  ) {
    const p = await this.get(tenantId, Number(packageId));
    const rules = await this.ruleRepo.find({ where: { tenantId, packageId } as any });
    const checks: [string, unknown][] = [
      ['CAMPUS', dims.campusId],
      ['TEACHER_LEVEL', dims.teacherLevel],
      ['CLASS_TYPE', dims.classType],
    ];
    for (const [dim, val] of checks) {
      if (val == null || val === '') continue;
      const hit = rules.find((r) => r.dimension === dim && String(r.dimValue) === String(val));
      if (hit) return r2(Number(hit.price));
    }
    return r2(Number(p.price));
  }

  // ---------------- 购课发放 ----------------

  /**
   * 购课/发放：按套餐 consume_mode 路由到不同账户模型（文档 §3.2）：
   * - BY_TIME   → entitlement（时间型权益，有效期内不限次）
   * - BY_PERIOD → enrollment（绑定班期，按课次出勤）
   * - BY_HOUR   → 课时账户；COMBO 组合套餐按子项拆分建账户，其余进课包账户
   */
  async purchase(tenantId: number, packageId: number, d: PurchasePackageDto, operatorId?: number) {
    const p = await this.get(tenantId, Number(packageId));

    const tier = d.tierId
      ? await this.tierRepo.findOne({ where: { tenantId, id: d.tierId, packageId: p.id } as any })
      : undefined;
    const hours = d.hours ?? (tier ? Number(tier.hours) : Number(p.totalHours));
    const amount = tier ? Number(tier.price) : Number(p.price);

    // 合规硬校验：单笔（课时 / 金额 / 时长）
    await this.assertCompliance(tenantId, {
      hours,
      amount,
      validDays: p.validDays ?? undefined,
    });

    // 反拆单：学员维度累计未消课时校验（赠课不计入）
    const isGift = d.grantType === 'GIFT';
    if (!isGift) {
      const limits = await this.limits(tenantId);
      const pending = await this.studentPendingHours(tenantId, d.studentId);
      if (pending + hours > limits.cumulativeHours) {
        throw new BusinessException(
          ResCode.BAD_REQUEST,
          `学员累计未消课时 ${pending + hours} 超出监管上限 ${limits.cumulativeHours} 课时（含本次 ${hours} 课时）`,
        );
      }
    }

    const unitValue = hours > 0 ? r2(amount / hours) : 0;
    const grantType = d.grantType || 'PAID';

    // BY_TIME：时间型权益
    if (p.consumeMode === 'BY_TIME') {
      return this.hourSvc.grantEntitlement(tenantId, {
        studentId: d.studentId,
        packageId: p.id,
        expireAt: addDays(new Date(), p.validDays && p.validDays > 0 ? p.validDays : 30),
        refOrderId: d.orderId,
        operatorId,
        remark: `购买时间卡：${p.name}`,
      });
    }

    // BY_PERIOD：期课报名
    if (p.consumeMode === 'BY_PERIOD') {
      return this.hourSvc.enroll(tenantId, {
        studentId: d.studentId,
        classGroupId: p.classGroupId,
        packageId: p.id,
        refOrderId: d.orderId,
        totalLessons: hours,
      });
    }

    // BY_HOUR：组合套餐按子项拆分发放
    const items = await this.itemRepo.find({ where: { tenantId, packageId: p.id } as any });
    if (p.sellType === 'COMBO' && items.length && items.every((i) => (i.hours || 0) > 0)) {
      const accounts: any[] = [];
      for (const it of items) {
        accounts.push(
          await this.hourSvc.grant(tenantId, {
            studentId: d.studentId,
            courseId: Number(it.courseId),
            packageId: p.id,
            type: 'CLASS',
            hours: Number(it.hours),
            operatorId,
            refOrderId: d.orderId,
            orderItemId: d.orderItemId,
            remark: `${p.name}（${it.hours} 课时）`,
            unitValue: hours > 0 ? r2(amount / hours) : 0,
            validDays: p.validDays,
            grantType,
          }),
        );
      }
      return { mode: 'BY_HOUR', split: true, hours, accounts };
    }

    // BY_HOUR：通用/限定课时包 → 课包账户（可跨套餐内课程抵扣）
    const acc = await this.hourSvc.grant(tenantId, {
      studentId: d.studentId,
      type: 'GENERAL',
      hours,
      packageId: p.id,
      operatorId,
      refOrderId: d.orderId,
      orderItemId: d.orderItemId,
      remark: `购买课包：${p.name}`,
      unitValue,
      validDays: p.validDays,
      grantType,
    });
    return { mode: 'BY_HOUR', split: false, hours, account: acc };
  }
}
