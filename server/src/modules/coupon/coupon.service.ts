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
  PreviewRedeemDto,
} from './dto/coupon.dto';

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

  /** 预览抵扣金额（不落库）：校验可用性并算出 discount */
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
    let discount = 0;
    if (tpl.type === 'AMOUNT') discount = Math.min(Number(tpl.value), Number(amount));
    else if (tpl.type === 'DISCOUNT') {
      discount = Math.round((Number(amount) * Number(tpl.value)) / 100 * 100) / 100;
    }
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

  private async genCode(tenantId: number, templateId: number): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = `CP${tenantId}${templateId}${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = await this.grantRepo.findOne({ where: { tenantId, code } as any });
      if (!exists) return code;
    }
    throw new BusinessException(ResCode.BAD_REQUEST, '生成券码失败，请重试');
  }
}
