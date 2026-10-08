import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BaseService } from '../../common/crud/base.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import { CourseCategory } from './entities/course-category.entity';
import { Course } from './entities/course.entity';
import { ClassGroup } from './entities/class-group.entity';
import { Lesson, LessonStatus } from './entities/lesson.entity';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseCategoryDto,
  UpdateCourseCategoryDto,
  CreateClassGroupDto,
  UpdateClassGroupDto,
  CreateLessonDto,
  UpdateLessonDto,
  CoursePageQueryDto,
  GenerateLessonsDto,
  LessonSlotDto,
} from './dto/course.dto';

@Injectable()
export class CourseService {
  private readonly category = new BaseService<CourseCategory>(null as any);
  private readonly course = new BaseService<Course>(null as any);
  private readonly classGroup = new BaseService<ClassGroup>(null as any);
  private readonly lesson = new BaseService<Lesson>(null as any);

  constructor(
    @InjectRepository(CourseCategory) categoryRepo: Repository<CourseCategory>,
    @InjectRepository(Course) courseRepo: Repository<Course>,
    @InjectRepository(ClassGroup) classGroupRepo: Repository<ClassGroup>,
    @InjectRepository(Lesson) lessonRepo: Repository<Lesson>,
  ) {
    this.category = new BaseService(categoryRepo);
    this.course = new BaseService(courseRepo);
    this.classGroup = new BaseService(classGroupRepo);
    this.lesson = new BaseService(lessonRepo);
  }

  // ---------- 课程分类 ----------
  createCategory(t: number, d: CreateCourseCategoryDto) {
    return this.category.create(t, d);
  }
  listCategory(t: number) {
    return this.category.findAll(t);
  }
  updateCategory(t: number, id: number, d: UpdateCourseCategoryDto) {
    return this.category.update(t, id, d);
  }
  removeCategory(t: number, id: number) {
    return this.category.remove(t, id);
  }

  // ---------- 课程 ----------
  createCourse(t: number, d: CreateCourseDto) {
    return this.course.create(t, d);
  }
  async listCourse(t: number, q: CoursePageQueryDto) {
    const where: any = {};
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.type) where.type = q.type;
    if (q.status != null) where.status = q.status;
    if (q.keyword) where.name = Like(`%${q.keyword}%`); // 简化：精确/模糊交给 DB LIKE 可在此扩展
    return this.course.paginate(t, q, where);
  }
  getCourse(t: number, id: number) {
    return this.course.findOne(t, id);
  }
  updateCourse(t: number, id: number, d: UpdateCourseDto) {
    return this.course.update(t, id, d);
  }
  removeCourse(t: number, id: number) {
    return this.course.remove(t, id);
  }

  // ---------- 班级 ----------
  createClassGroup(t: number, d: CreateClassGroupDto) {
    return this.classGroup.create(t, d);
  }
  listClassGroup(t: number, q: PageQueryDto, courseId?: number) {
    return this.classGroup.paginate(t, q, courseId ? { courseId } : {});
  }
  async getClassGroup(t: number, id: number) {
    const cg = await this.classGroup.findOne(t, id);
    // 实体采用普通外键列（无 ORM 关联），课次单独查询后装配
    (cg as any).lessons = await this.lesson.repo.find({
      where: { tenantId: t, classGroupId: id },
      order: { startTime: 'ASC' } as any,
    });
    return cg;
  }
  updateClassGroup(t: number, id: number, d: UpdateClassGroupDto) {
    return this.classGroup.update(t, id, d);
  }
  removeClassGroup(t: number, id: number) {
    return this.classGroup.remove(t, id);
  }

  // ---------- 课次（含排课冲突检测 §8.5） ----------
  async createLesson(t: number, d: CreateLessonDto) {
    await this.assertNoConflict(t, d.teacherId, d.roomId, d.classGroupId, new Date(d.startTime), new Date(d.endTime));
    return this.lesson.create(t, {
      classGroupId: d.classGroupId,
      courseId: d.courseId,
      teacherId: d.teacherId,
      startTime: new Date(d.startTime),
      endTime: new Date(d.endTime),
      roomId: d.roomId,
      status: LessonStatus.SCHEDULED,
    });
  }
  listLesson(t: number, q: PageQueryDto, classGroupId?: number) {
    return this.lesson.paginate(t, q, classGroupId ? { classGroupId } : {});
  }
  getLesson(t: number, id: number) {
    return this.lesson.findOne(t, id);
  }
  async updateLesson(t: number, id: number, d: UpdateLessonDto) {
    const cur = await this.lesson.findOne(t, id);
    if ((d.startTime || d.endTime || d.teacherId || d.roomId) && (d.startTime || d.endTime)) {
      await this.assertNoConflict(
        t,
        d.teacherId ?? cur.teacherId,
        d.roomId ?? cur.roomId,
        cur.classGroupId,
        new Date(d.startTime ?? cur.startTime),
        new Date(d.endTime ?? cur.endTime),
        id,
      );
    }
    const patch: Partial<Lesson> = {};
    if (d.teacherId !== undefined) patch.teacherId = d.teacherId;
    if (d.roomId !== undefined) patch.roomId = d.roomId;
    if (d.status !== undefined) patch.status = d.status as LessonStatus;
    if (d.startTime) patch.startTime = new Date(d.startTime);
    if (d.endTime) patch.endTime = new Date(d.endTime);
    return this.lesson.update(t, id, patch);
  }
  removeLesson(t: number, id: number) {
    return this.lesson.remove(t, id);
  }

  /**
   * 按周批量生成课次（文档 §4.1 课次编排 / §6.12）。
   * 时段优先取入参 slots，否则取班级 scheduleJson。
   * 逐条做冲突检测（§8.5）：冲突的时段跳过并计数，不中断整体生成。
   */
  async generateLessons(t: number, d: GenerateLessonsDto) {
    const cg = await this.classGroup.findOne(t, d.classGroupId);
    const slots: LessonSlotDto[] = (d.slots?.length
      ? d.slots
      : (cg.scheduleJson as any[] | undefined) || []) as LessonSlotDto[];
    if (!slots.length) {
      throw new BusinessException(ResCode.BAD_REQUEST, '未配置上课时段：请传 slots 或设置班级上课周期');
    }
    const teacherId = d.teacherId ?? cg.teacherId;

    const created: Lesson[] = [];
    const skipped: { date: string; reason: string }[] = [];

    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (end.getTime() < start.getTime()) {
      throw new BusinessException(ResCode.BAD_REQUEST, '结束日期不能早于开始日期');
    }

    for (let cur = new Date(start); cur.getTime() <= end.getTime(); cur.setDate(cur.getDate() + 1)) {
      // JS getDay: 0=周日；业务 weekday: 1=周一 ... 7=周日
      const jsDay = cur.getDay();
      const weekday = jsDay === 0 ? 7 : jsDay;
      for (const slot of slots) {
        if (slot.weekday !== weekday) continue;
        const s = this.atTime(cur, slot.start);
        const e = this.atTime(cur, slot.end);
        try {
          await this.assertNoConflict(t, teacherId, d.roomId, cg.id, s, e);
          created.push(
            await this.lesson.create(t, {
              classGroupId: cg.id,
              courseId: cg.courseId,
              teacherId,
              startTime: s,
              endTime: e,
              roomId: d.roomId,
              status: LessonStatus.SCHEDULED,
            }),
          );
        } catch (e) {
          skipped.push({
            date: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')} ${slot.start}`,
            reason: (e as any)?.message || '排课冲突',
          });
        }
      }
    }
    return { createdCount: created.length, skippedCount: skipped.length, created, skipped };
  }

  /** 把 YYYY-MM-DD + HH:mm 组装为本地时间 Date */
  private atTime(d: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const x = new Date(d);
    x.setHours(h || 0, m || 0, 0, 0);
    return x;
  }

  /**
   * 排课冲突检测（文档 §8.5）：同一 老师/教室/班级 时段重叠则拦截。
   * 强制覆盖须经审批（§4.16），此处仅做基础校验。
   */
  private async assertNoConflict(
    t: number,
    teacherId: number | undefined,
    roomId: number | undefined,
    classGroupId: number | undefined,
    start: Date,
    end: Date,
    excludeId?: number,
  ) {
    // 候选：同一 老师/教室/班级 的未取消课次（DB 层面取集合）
    const qb = this.lesson.repo
      .createQueryBuilder('l')
      .where('l.tenant_id = :t', { t })
      .andWhere('l.deleted_at IS NULL')
      .andWhere("l.status != 'CANCELLED'");
    if (excludeId) qb.andWhere('l.id != :excludeId', { excludeId });
    const conditions: string[] = [];
    const params: any = {};
    if (teacherId) { conditions.push('l.teacher_id = :teacherId'); params.teacherId = teacherId; }
    if (roomId) { conditions.push('l.room_id = :roomId'); params.roomId = roomId; }
    if (classGroupId) { conditions.push('l.class_group_id = :classGroupId'); params.classGroupId = classGroupId; }
    if (conditions.length) qb.andWhere(`(${conditions.join(' OR ')})`, params);

    const candidates = await qb.getMany();
    // 时段重叠判定在 JS 层用 Date 语义做，跨数据库（MySQL/SQLite）一致可靠。
    // SQLite 驱动可能将 datetime 以字符串返回，统一 new Date() 归一化。
    const hit = candidates.find((l) => {
      const ls = l.startTime instanceof Date ? l.startTime : new Date(l.startTime);
      const le = l.endTime instanceof Date ? l.endTime : new Date(l.endTime);
      return start < le && end > ls;
    });
    if (hit) {
      throw new BusinessException(ResCode.CONFLICT, '排课冲突：老师/教室/班级在该时段已占用');
    }
  }
}
