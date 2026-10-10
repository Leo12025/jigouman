import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { OnlineClass } from './entities/online-class.entity';
import { StudyRecord } from './entities/study-record.entity';
import { CreateOnlineClassDto, UpdateOnlineClassDto, CreateStudyRecordDto, TeachingPageQueryDto } from './dto/teaching.dto';

@Injectable()
export class TeachingService {
  constructor(
    @InjectRepository(OnlineClass) private readonly cls: Repository<OnlineClass>,
    @InjectRepository(StudyRecord) private readonly rec: Repository<StudyRecord>,
  ) {}

  async createClass(tenantId: number, d: CreateOnlineClassDto) {
    const e = this.cls.create({ tenantId, ...(d as any) } as OnlineClass);
    return this.cls.save(e as any);
  }

  async listClasses(tenantId: number, q: TeachingPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.teacherId) where.teacherId = q.teacherId;
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.cls.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async getClass(tenantId: number, id: number) {
    const e = await this.cls.findOne({ where: { tenantId, id } as any });
    if (!e) throw new BusinessException(ResCode.BAD_REQUEST, '课堂不存在');
    return e;
  }

  async updateClass(tenantId: number, id: number, d: UpdateOnlineClassDto) {
    const e = await this.getClass(tenantId, id);
    Object.assign(e, d as any);
    return this.cls.save(e as any);
  }

  async removeClass(tenantId: number, id: number) {
    await this.getClass(tenantId, id);
    await this.cls.softDelete({ tenantId, id } as any);
    return { id };
  }

  async startClass(tenantId: number, id: number) {
    const e = await this.getClass(tenantId, id);
    e.status = 'LIVE';
    return this.cls.save(e as any);
  }

  async endClass(tenantId: number, id: number) {
    const e = await this.getClass(tenantId, id);
    e.status = 'ENDED';
    return this.cls.save(e as any);
  }

  /** 督学打卡：记录学员出勤 */
  async recordStudy(tenantId: number, d: CreateStudyRecordDto) {
    await this.getClass(tenantId, d.classId);
    const e = this.rec.create({
      tenantId,
      joinedAt: new Date(),
      status: d.status || 'PRESENT',
      ...(d as any),
    } as StudyRecord);
    return this.rec.save(e as any);
  }

  async listStudy(tenantId: number, classId: number) {
    return this.rec.find({ where: { tenantId, classId } as any, order: { id: 'DESC' } as any });
  }

  /** 出勤统计：各状态人数 */
  async stats(tenantId: number, classId: number) {
    const list = await this.rec.find({ where: { tenantId, classId } as any });
    const byStatus: Record<string, number> = {};
    for (const r of list) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    return { classId, total: list.length, byStatus };
  }
}
