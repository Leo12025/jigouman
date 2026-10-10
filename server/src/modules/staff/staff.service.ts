import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { Certificate } from './entities/certificate.entity';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeePageQueryDto,
  UpsertTeacherProfileDto,
  CreateCertificateDto,
  UpdateCertificateDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Employee) private readonly emp: Repository<Employee>,
    @InjectRepository(TeacherProfile) private readonly profile: Repository<TeacherProfile>,
    @InjectRepository(Certificate) private readonly cert: Repository<Certificate>,
  ) {}

  async create(tenantId: number, d: CreateEmployeeDto) {
    const e = this.emp.create({ tenantId, ...(d as any) } as Employee);
    return this.emp.save(e as any);
  }

  async list(tenantId: number, q: EmployeePageQueryDto) {
    const where: any = { tenantId };
    if (q.kind) where.kind = q.kind;
    if (q.status) where.status = q.status;
    if (q.keyword) where.name = Like(`%${q.keyword}%`);
    const page = q.page || 1;
    const size = q.size || 20;
    const [list, total] = await this.emp.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (page - 1) * size,
      take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async get(tenantId: number, id: number) {
    const e = await this.emp.findOne({ where: { tenantId, id } as any });
    if (!e) throw new NotFoundException('员工不存在');
    return e;
  }

  async update(tenantId: number, id: number, d: UpdateEmployeeDto) {
    const e = await this.get(tenantId, id);
    Object.assign(e, d as any);
    return this.emp.save(e as any);
  }

  async remove(tenantId: number, id: number) {
    await this.get(tenantId, id);
    await this.emp.softDelete({ tenantId, id } as any);
    return { id };
  }

  /** 维护师资档案：首次创建、后续更新（文档 §4.14） */
  async upsertTeacherProfile(
    tenantId: number,
    employeeId: number,
    d: UpsertTeacherProfileDto,
  ) {
    await this.get(tenantId, employeeId);
    let p = await this.profile.findOne({ where: { tenantId, employeeId } as any });
    if (!p) {
      p = this.profile.create({ tenantId, employeeId, ...(d as any) } as TeacherProfile);
    } else {
      Object.assign(p, d as any);
    }
    return this.profile.save(p as any);
  }

  async listCertificates(tenantId: number, employeeId: number) {
    return this.cert.find({
      where: { tenantId, employeeId } as any,
      order: { id: 'DESC' } as any,
    });
  }

  async addCertificate(tenantId: number, employeeId: number, d: CreateCertificateDto) {
    await this.get(tenantId, employeeId);
    const c = this.cert.create({ tenantId, employeeId, ...(d as any) } as Certificate);
    return this.cert.save(c as any);
  }

  async updateCertificate(tenantId: number, id: number, d: UpdateCertificateDto) {
    const c = await this.cert.findOne({ where: { tenantId, id } as any });
    if (!c) throw new NotFoundException('证书不存在');
    Object.assign(c, d as any);
    return this.cert.save(c as any);
  }

  async removeCertificate(tenantId: number, id: number) {
    const c = await this.cert.findOne({ where: { tenantId, id } as any });
    if (!c) throw new NotFoundException('证书不存在');
    await this.cert.softDelete({ tenantId, id } as any);
    return { id };
  }
}
