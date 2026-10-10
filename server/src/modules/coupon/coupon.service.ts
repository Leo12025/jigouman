import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { CouponTemplate } from './entities/coupon-template.entity';
import { CouponGrant } from './entities/coupon-grant.entity';
import {
  CreateCouponTemplateDto,
  UpdateCouponTemplateDto,
  GrantCouponDto,
  CouponPageQueryDto,
  CalcPromotionDto,
  CalcPromotionItemDto,
} from './dto/coupon.dto';

interface CalcItem extends CalcPromotionItemDto {}
interface GiftItem { courseId: number; qty: number; name: string; unitPrice: number }
interface AppliedPromo {
  templateId: number; name: string; type: string; discount: number;
  giftItems?: GiftItem[];
}
export interface CalcResult {
  totalDiscount: number;
  applied: AppliedPromo[];
  giftItems: GiftItem[];
  redeemCodes: string[];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponTemplate) private readonly tpl: Repository<CouponTemplate>,
    @InjectRepository(CouponGrant) private readonly grantRepo: Repository<CouponGrant>,
  ) {}

  async createTemplate(tenantId: number, d: CreateCouponTemplateDto) {
    const t = this.tpl.create({ tenantId, ...(d as any) } as CouponTemplate);
    return this.tpl.save(t as any);
  }

  async listTemplates(tenantId: number, q: CouponPageQueryDto) {
    const where: any = { tenantId };
    if (q.type) where.type = q.type;
    if (q.autoApply !== undefined) where.autoApply = q.autoApply;
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.tpl.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async getTemplate(tenantId: number, id: number) {
    const t = await this.tpl.findOne({ where: { tenantId, id } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '券模板不存在');
    return t;
  }

  async updateTemplate(tenantId: number, id: number, d: UpdateCouponTemplateDto) {
    const t = await this.getTemplate(tenantId, id);
    Object.assign(t, d as any);
    return this.tpl.save(t as any);
  }

  async removeTemplate(tenantId: number, id: number) {
    const t = await this.getTemplate(tenantId, id);
    await this.tpl.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 发放优惠券到学员（校验库存/每人限领） */
  async grant(tenantId: number, d: GrantCouponDto) {
    const tpl = await this.getTemplate(tenantId, d.templateId);
    if (tpl.status !== 'ACTIVE') throw new BusinessException(ResCode.BAD_REQUEST, '券模板不可用');
    const count = d.count || 1;

    if (tpl.totalQty) {
      const issued = await this.grantRepo.count({ where: { tenantId, templateId: d.templateId } as any });
      if (issued + count > tpl.totalQty) {
        throw new BusinessException(ResCode.BAD_REQUEST, '优惠券库存不足');
      }
    }
    const owned = await this.grantRepo.count({
      where: { tenantId, templateId: d.templateId, studentId: d.studentId } as any,
    });
    if (owned + count > (tpl.perLimit || 1)) {
      throw new BusinessException(ResCode.BAD_REQUEST, `每人限领 ${tpl.perLimit} 张`);
    }

    const out: CouponGrant[] = [];
    for (let i = 0; i < count; i++) {
      const code = await this.genCode(tenantId, d.templateId);
      const g = this.grantRepo.create({
        tenantId,
        templateId: d.templateId,
        studentId: d.studentId,
        code,
        expireAt: addDays(new Date(), tpl.validDays),
      } as CouponGrant);
      out.push(await this.grantRepo.save(g as any));
    }
    return out;
  }

  async listGrants(tenantId: number, q: CouponPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.templateId) where.templateId = q.templateId;
    if (q.status) where.status = q.status;
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.grantRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  /** 金额类优惠计算（不含买赠/限时特价，后者需订单项） */
  private discountOf(tpl: CouponTemplate, eligibleSubtotal: number): number {
    if (tpl.type === 'AMOUNT') return Math.min(Number(tpl.value), eligibleSubtotal);
    if (tpl.type === 'DISCOUNT') {
      return Math.round(eligibleSubtotal * Number(tpl.value) / 100 * 100) / 100;
    }
    if (tpl.type === 'FULL_REDUCTION') {
      const tiers = (tpl.tiers as any[]) || [];
      let best = 0;
      for (const t of tiers) {
        if (eligibleSubtotal >= Number(t.threshold)) best = Math.max(best, Number(t.minus));
      }
      if (!tiers.length && Number(tpl.value) > 0 && eligibleSubtotal >= Number(tpl.minSpend)) {
        best = Number(tpl.value);
      }
      return Math.round(best * 100) / 100;
    }
    return 0; // GIFT / FLASH 由 calcPromotion 处理
  }

  /** 预览抵扣金额（不落库）：校验可用性并算出 discount（兼容旧单券预览） */
  async preview(tenantId: number, code: string, amount: number, courseId?: number) {
    const g = await this.grantRepo.findOne({ where: { tenantId, code } as any });
    if (!g) throw new BusinessException(ResCode.BAD_REQUEST, '优惠券不存在');
    if (g.status !== 'UNUSED') throw new BusinessException(ResCode.BAD_REQUEST, '优惠券已使用或已失效');
    if (g.expireAt && g.expireAt < new Date()) {
      throw new BusinessException(ResCode.BAD_REQUEST, '优惠券已过期');
    }
    const tpl = await this.getTemplate(tenantId, g.templateId);
    const now = new Date();
    if (tpl.startTime && tpl.startTime > now) throw new BusinessException(ResCode.BAD_REQUEST, '未到使用时间');
    if (tpl.endTime && tpl.endTime < now) throw new BusinessException(ResCode.BAD_REQUEST, '优惠券已过期');
    if (Number(tpl.minSpend) > Number(amount)) {
      throw new BusinessException(ResCode.BAD_REQUEST, `满 ${tpl.minSpend} 元可用`);
    }
    if (tpl.applicableCourseIds?.length && courseId && !tpl.applicableCourseIds.includes(Number(courseId))) {
      throw new BusinessException(ResCode.BAD_REQUEST, '该优惠券不适用于此课程');
    }
    let discount = this.discountOf(tpl, amount);
    discount = Math.round(discount * 100) / 100;
    return { code, discount, template: tpl };
  }

  /** 核销（落库为已用），返回抵扣金额 */
  async redeem(tenantId: number, code: string, orderId: number, amount: number, courseId?: number) {
    const res = await this.preview(tenantId, code, amount, courseId);
    const g = await this.grantRepo.findOne({ where: { tenantId, code } as any });
    g!.status = 'USED';
    g!.usedAt = new Date();
    g!.orderId = orderId;
    await this.grantRepo.save(g as any);
    return res.discount;
  }

  /** 批量核销（支付成功后调用） */
  async redeemMany(tenantId: number, codes: string[], orderId: number, amount: number) {
    for (const code of codes) {
      await this.redeem(tenantId, code, orderId, amount).catch(() => undefined);
    }
  }

  /**
   * 完整促销试算引擎（§4.17 高级玩法）：
   * 合并「全场自动活动(autoApply)」+「学员提交券码」，按适用条件过滤后应用叠加/互斥规则，
   * 返回总减免、命中明细、买赠赠品、需核销券码。
   */
  async calcPromotion(tenantId: number, d: CalcPromotionDto): Promise<CalcResult> {
    const items: CalcItem[] = d.items || [];
    const orderAmount = Math.round(
      (d.amount ?? items.reduce((s, it) => s + it.qty * it.unitPrice, 0)) * 100,
    ) / 100;
    const tags = d.studentTags || [];
    const now = new Date();

    // 1) 候选模板：全场自动活动 + 券码对应模板
    const cands: { tpl: CouponTemplate; code?: string }[] = [];
    if (d.includeAuto !== false) {
      const autos = await this.tpl.find({ where: { tenantId, status: 'ACTIVE', autoApply: 1 } as any });
      for (const tpl of autos) cands.push({ tpl });
    }
    for (const code of d.codes || []) {
      const g = await this.grantRepo.findOne({ where: { tenantId, code } as any });
      if (!g || g.status !== 'UNUSED') continue;
      if (g.expireAt && g.expireAt < now) continue;
      const tpl = await this.getTemplate(tenantId, g.templateId);
      if (tpl.status !== 'ACTIVE') continue;
      cands.push({ tpl, code });
    }

    // 2) 适用条件过滤 + 计算原始减免/赠品
    interface Cand { tpl: CouponTemplate; code?: string; discount: number; giftItems: GiftItem[] }
    const valid: Cand[] = [];
    for (const c of cands) {
      const tpl = c.tpl;
      if (tpl.startTime && tpl.startTime > now) continue;
      if (tpl.endTime && tpl.endTime < now) continue;
      if (tpl.applicableStudentTags?.length && !tpl.applicableStudentTags.some((t) => tags.includes(t))) continue;

      const courseFilter = tpl.applicableCourseIds?.length ? tpl.applicableCourseIds : null;
      const cgFilter = tpl.applicableClassGroupIds?.length ? tpl.applicableClassGroupIds : null;
      const matched = items.filter((it) => {
        if (courseFilter && !courseFilter.includes(Number(it.courseId))) return false;
        if (cgFilter && it.classGroupId && !cgFilter.includes(Number(it.classGroupId))) return false;
        return true;
      });
      const scoped = courseFilter || cgFilter;
      const eligibleSubtotal = scoped
        ? matched.reduce((s, it) => s + it.qty * it.unitPrice, 0)
        : orderAmount;
      if (scoped && !matched.length) continue;
      if (Number(tpl.minSpend) > eligibleSubtotal + 1e-9) continue;

      let discount = 0;
      const giftItems: GiftItem[] = [];
      if (tpl.type === 'FLASH') {
        for (const it of matched) {
          const fp = Number(tpl.value);
          if (fp < it.unitPrice) discount += Math.round((it.unitPrice - fp) * it.qty * 100) / 100;
        }
      } else if (tpl.type === 'GIFT') {
        const rule = tpl.giftRule as any;
        if (rule?.buyQty && rule.giftCourseId) {
          const buyQty = matched.reduce((s, it) => s + it.qty, 0);
          const rounds = Math.floor(buyQty / Number(rule.buyQty));
          const gq = rounds * Number(rule.giftQty || 1);
          if (gq > 0) {
            giftItems.push({
              courseId: Number(rule.giftCourseId),
              qty: gq,
              name: rule.giftName || '赠品课程',
              unitPrice: 0,
            });
          }
        }
      } else {
        discount = this.discountOf(tpl, eligibleSubtotal);
      }
      if (discount <= 0 && giftItems.length === 0) continue;
      valid.push({ tpl, code: c.code, discount: Math.round(discount * 100) / 100, giftItems });
    }

    // 3) 叠加 / 互斥规则
    const nonStackable = valid.filter((v) => v.tpl.stackable === 0);
    let selected: Cand[];
    if (nonStackable.length) {
      nonStackable.sort((a, b) => rank(b) - rank(a));
      selected = [nonStackable[0]]; // 非叠加：仅生效最优一个
    } else {
      const groups = new Map<string, Cand[]>();
      const noGroup: Cand[] = [];
      for (const v of valid) {
        if (v.tpl.stackGroup) {
          if (!groups.has(v.tpl.stackGroup)) groups.set(v.tpl.stackGroup, []);
          groups.get(v.tpl.stackGroup)!.push(v);
        } else noGroup.push(v);
      }
      selected = [];
      for (const arr of groups.values()) {
        arr.sort((a, b) => rank(b) - rank(a));
        selected.push(arr[0]); // 同互斥组仅留最优
      }
      selected.push(...noGroup);
      selected.sort(
        (a, b) => Number(b.tpl.priority) - Number(a.tpl.priority) || rank(b) - rank(a),
      );
      const maxStack = Math.max(1, Math.min(5, ...selected.map((s) => Number(s.tpl.maxStack || 3))));
      selected = selected.slice(0, maxStack);
    }

    // 4) 汇总
    let totalDiscount = 0;
    const applied: AppliedPromo[] = [];
    const giftItems: GiftItem[] = [];
    const redeemCodes: string[] = [];
    for (const s of selected) {
      totalDiscount += s.discount;
      if (s.code) redeemCodes.push(s.code);
      if (s.giftItems.length) {
        giftItems.push(...s.giftItems);
        applied.push({ templateId: s.tpl.id, name: s.tpl.name, type: s.tpl.type, discount: s.discount, giftItems: s.giftItems });
      } else {
        applied.push({ templateId: s.tpl.id, name: s.tpl.name, type: s.tpl.type, discount: s.discount });
      }
    }
    return {
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      applied,
      giftItems,
      redeemCodes,
    };
  }

  private async genCode(tenantId: number, templateId: number): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = `CP${tenantId}${templateId}${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = await this.grantRepo.findOne({ where: { tenantId, code } as any });
      if (!exists) return code;
    }
    throw new BusinessException(ResCode.BAD_REQUEST, '生成券码失败，请重试');
  }
}

function rank(v: { discount: number; giftItems: GiftItem[] }): number {
  return v.discount + (v.giftItems?.length || 0) * 1e6;
}
