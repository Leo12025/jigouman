import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { ContractTemplate } from './entities/contract-template.entity';
import { Contract } from './entities/contract.entity';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
  CreateContractDto,
  SignContractDto,
  ContractPageQueryDto,
} from './dto/contract.dto';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(ContractTemplate) private readonly tpl: Repository<ContractTemplate>,
    @InjectRepository(Contract) private readonly repo: Repository<Contract>,
  ) {}

  // ---- 模板 ----
  async createTemplate(tenantId: number, d: CreateContractTemplateDto) {
    const t = this.tpl.create({ tenantId, ...(d as any) } as ContractTemplate);
    return this.tpl.save(t as any);
  }
  async listTemplates(tenantId: number, q: ContractPageQueryDto) {
    const where: any = { tenantId };
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.tpl.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async getTemplate(tenantId: number, id: number) {
    const t = await this.tpl.findOne({ where: { tenantId, id } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '合同模板不存在');
    return t;
  }
  async updateTemplate(tenantId: number, id: number, d: UpdateContractTemplateDto) {
    const t = await this.getTemplate(tenantId, id);
    Object.assign(t, d as any);
    return this.tpl.save(t as any);
  }
  async removeTemplate(tenantId: number, id: number) {
    await this.getTemplate(tenantId, id);
    await this.tpl.softDelete({ tenantId, id } as any);
    return { id };
  }

  // ---- 合同实例 ----
  async createContract(tenantId: number, d: CreateContractDto) {
    const tpl = await this.getTemplate(tenantId, d.templateId);
    if (tpl.status !== 'ACTIVE') throw new BusinessException(ResCode.BAD_REQUEST, '模板不可用');
    const c = this.repo.create({
      tenantId,
      templateId: d.templateId,
      studentId: d.studentId,
      partyName: d.partyName,
      idCard: d.idCard,
      relatedType: d.relatedType,
      relatedId: d.relatedId,
      remark: d.remark,
      status: 'DRAFT',
    } as Contract);
    return this.repo.save(c as any);
  }

  async listContracts(tenantId: number, q: ContractPageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.status) where.status = q.status;
    if (q.relatedType) where.relatedType = q.relatedType;
    if (q.relatedId) where.relatedId = q.relatedId;
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.repo.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async getContract(tenantId: number, id: number) {
    const c = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!c) throw new BusinessException(ResCode.BAD_REQUEST, '合同不存在');
    return c;
  }

  /** 系统自带电子签：实名 + 手写签名 + 生成存证链（sha256，无需第三方） */
  async sign(tenantId: number, id: number, d: SignContractDto) {
    const c = await this.getContract(tenantId, id);
    if (c.status !== 'DRAFT') throw new BusinessException(ResCode.BAD_REQUEST, '仅草稿合同可签署');
    const now = new Date();
    const partyName = d.partyName || c.partyName;
    const idCard = d.idCard || c.idCard;
    if (!partyName || !idCard) throw new BusinessException(ResCode.BAD_REQUEST, '缺少实名信息(姓名/证件号)');
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = JSON.stringify({
      contractId: id, tenantId, partyName, idCard,
      templateId: c.templateId, signatureResId: d.signatureResId, signedAt: now.toISOString(), nonce,
    });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    c.partyName = partyName;
    c.idCard = idCard;
    c.signatureResId = d.signatureResId ?? c.signatureResId;
    c.status = 'SIGNED';
    c.signedAt = now;
    c.evidence = { algorithm: 'sha256', hash, signedAt: now.toISOString(), nonce };
    return this.repo.save(c as any);
  }

  async invalidate(tenantId: number, id: number, reason?: string) {
    const c = await this.getContract(tenantId, id);
    if (c.status === 'INVALID') return c;
    c.status = 'INVALID';
    c.remark = reason ? `${c.remark || ''}\n作废:${reason}` : c.remark;
    return this.repo.save(c as any);
  }
}
