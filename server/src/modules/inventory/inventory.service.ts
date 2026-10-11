import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { Material } from './entities/material.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { CreateMaterialDto, UpdateMaterialDto, StockAdjustDto, InventoryPageQueryDto } from './dto/inventory.dto';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class InventoryService {
  private readonly mat: Repository<Material>;
  private readonly mv: Repository<StockMovement>;
  constructor(
    @InjectRepository(Material) mat: Repository<Material>,
    @InjectRepository(StockMovement) mv: Repository<StockMovement>,
  ) {
    this.mat = orgRepo(mat);
    this.mv = orgRepo(mv);
  }

  async create(tenantId: number, d: CreateMaterialDto) {
    const m = this.mat.create({ tenantId, stockQty: d.stockQty || 0, warningQty: d.warningQty || 0, ...(d as any) } as Material);
    return this.mat.save(m as any);
  }
  async list(tenantId: number, q: InventoryPageQueryDto) {
    const where: any = { tenantId };
    if (q.category) where.category = q.category;
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    const page = q.page || 1; const size = q.size || 20;
    const [list, total] = await this.mat.findAndCount({ where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
  async get(tenantId: number, id: number) {
    const m = await this.mat.findOne({ where: { tenantId, id } as any });
    if (!m) throw new NotFoundException('物料不存在');
    return m;
  }
  async update(tenantId: number, id: number, d: UpdateMaterialDto) {
    const m = await this.get(tenantId, id);
    Object.assign(m, d as any);
    return this.mat.save(m as any);
  }
  async remove(tenantId: number, id: number) {
    await this.get(tenantId, id);
    await this.mat.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 出入库：写流水并改库存（出库不得为负） */
  async adjust(tenantId: number, id: number, d: StockAdjustDto, operatorId?: number) {
    const m = await this.get(tenantId, id);
    const delta = d.type === 'IN' ? d.qty : -d.qty;
    const after = (m.stockQty || 0) + delta;
    if (after < 0) throw new BusinessException(ResCode.BAD_REQUEST, '库存不足');
    m.stockQty = after;
    await this.mat.save(m as any);
    const move = this.mv.create({ tenantId, materialId: id, type: d.type, qty: d.qty, remark: d.remark, operatorId } as StockMovement);
    return this.mv.save(move as any);
  }

  async listMovements(tenantId: number, materialId: number) {
    return this.mv.find({ where: { tenantId, materialId } as any, order: { id: 'DESC' } as any });
  }
}
