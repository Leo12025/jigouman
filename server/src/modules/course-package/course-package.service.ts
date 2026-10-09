import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CoursePackage } from './entities/course-package.entity';
import { PackageCourse } from './entities/package-course.entity';
import {
  CreateCoursePackageDto, UpdateCoursePackageDto, AddPackageCoursesDto,
  PurchasePackageDto, CoursePackagePageQueryDto,
} from './dto/course-package.dto';
import { Course } from '../course/entities/course.entity';
import { HourService } from '../hour/hour.service';

@Injectable()
export class CoursePackageService {
  constructor(
    @InjectRepository(CoursePackage) private readonly pkgRepo: Repository<CoursePackage>,
    @InjectRepository(PackageCourse) private readonly pcRepo: Repository<PackageCourse>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    private readonly hourSvc: HourService,
  ) {}

  async create(tenantId: number, d: CreateCoursePackageDto) {
    const p = this.pkgRepo.create({
      tenantId,
      name: d.name,
      description: d.description,
      totalHours: d.totalHours,
      validDays: d.validDays,
      price: d.price,
      status: d.status ?? 1,
      remark: d.remark,
    } as CoursePackage);
    return this.pkgRepo.save(p as any);
  }

  async update(tenantId: number, id: number, d: UpdateCoursePackageDto) {
    const p = await this.pkgRepo.findOne({ where: { tenantId, id } as any });
    if (!p) throw new NotFoundException('课包不存在');
    Object.assign(p, {
      name: d.name ?? p.name,
      description: d.description ?? p.description,
      totalHours: d.totalHours ?? p.totalHours,
      validDays: d.validDays ?? p.validDays,
      price: d.price ?? p.price,
      status: d.status ?? p.status,
      remark: d.remark ?? p.remark,
    });
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
    return { id: p.id };
  }

  /** 关联/追加课程到课包（可上哪些课程） */
  async addCourses(tenantId: number, packageId: number, d: AddPackageCoursesDto) {
    await this.get(tenantId, Number(packageId));
    for (const courseId of d.courseIds) {
      const exists = await this.pcRepo.findOne({
        where: { tenantId, packageId, courseId } as any,
      });
      if (!exists) {
        await this.pcRepo.save(this.pcRepo.create({
          tenantId, packageId, courseId,
        } as PackageCourse) as any);
      }
    }
    return this.courses(tenantId, Number(packageId));
  }

  async removeCourse(tenantId: number, packageId: number, courseId: number) {
    await this.pcRepo.delete({ tenantId, packageId, courseId } as any);
    return { packageId: Number(packageId), courseId: Number(courseId) };
  }

  /** 课包含的课程（附带课程名） */
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

  /**
   * 购课/发放：将套餐课时发放到学员"课包账户"（courseId=null, packageId=套餐）。
   * 后续上课消课时可跨套餐内课程抵扣（见 HourService 课包回退）。
   */
  async purchase(tenantId: number, packageId: number, d: PurchasePackageDto, operatorId?: number) {
    const p = await this.get(tenantId, Number(packageId));
    const hours = d.hours ?? p.totalHours;
    const acc = await this.hourSvc.grant(tenantId, {
      studentId: d.studentId,
      type: 'GENERAL',
      hours,
      packageId: p.id,
      operatorId,
      refOrderId: d.orderId,
      remark: `购买课包：${p.name}`,
    });
    return acc;
  }
}
