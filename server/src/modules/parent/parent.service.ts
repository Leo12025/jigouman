import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { Parent } from './entities/parent.entity';
import { StudentParent } from '../student/entities/student-parent.entity';
import { Student } from '../student/entities/student.entity';
import { StudentCourse, StudentCourseStatus } from '../student/entities/student-course.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { Homework } from '../homework/entities/homework.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';
import { CourseReview } from '../family/entities/course-review.entity';
import { FamilyService } from '../family/family.service';
import { GrowthService } from '../growth/growth.service';
import { HourConsumption } from '../hour/entities/hour-consumption.entity';
import { Attendance } from '../hour/entities/attendance.entity';
import { Order } from '../order/entities/order.entity';
import { SendOtpDto, ParentLoginDto, BindStudentDto } from './dto/parent.dto';
import { OrgService } from '../org/org.service';
import { TenantService } from '../tenant/tenant.service';

interface OtpRecord {
  code: string;
  expireAt: number;
  lastSentAt: number;
}

/** OTP 有效期 5 分钟；同一手机号 60 秒内只能发一次（§9.2 防短信轰炸） */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;

@Injectable()
export class ParentService {
  /** 内存态验证码（单机开发/测试；生产应接入短信服务并改用 Redis） */
  private readonly otpStore = new Map<string, OtpRecord>();

  constructor(
    @InjectRepository(Parent) private readonly parentRepo: Repository<Parent>,
    @InjectRepository(StudentParent) private readonly spRepo: Repository<StudentParent>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(StudentCourse) private readonly scRepo: Repository<StudentCourse>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Homework) private readonly hwRepo: Repository<Homework>,
    @InjectRepository(HomeworkSubmit) private readonly submitRepo: Repository<HomeworkSubmit>,
    @InjectRepository(CourseReview) private readonly reviewRepo: Repository<CourseReview>,
    @InjectRepository(HourConsumption) private readonly consRepo: Repository<HourConsumption>,
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly familySvc: FamilyService,
    private readonly growthSvc: GrowthService,
    private readonly jwt: JwtService,
    private readonly orgSvc: OrgService,
    private readonly tenantSvc: TenantService,
  ) {}

  // ---------- 家长端补齐：消课/考勤、成长档案、缴费、通知、续费提醒 ----------

  /** 我的消课与考勤（§11.6 家长端「消课通知」） */
  async myConsumptions(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    const consumptions = await this.consRepo.find({
      where: { tenantId, studentId: In(studentIds), type: 'CONSUME' } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
    const attendances = await this.attRepo.find({
      where: { tenantId, studentId: In(studentIds) } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
    const attMap = new Map(
      attendances.map((a) => [`${Number(a.lessonId)}_${Number(a.studentId)}`, a]),
    );
    return consumptions.map((c) => {
      const att = attMap.get(`${Number(c.lessonId)}_${Number(c.studentId)}`);
      return {
        id: c.id,
        studentId: Number(c.studentId),
        courseId: c.courseId,
        lessonId: c.lessonId,
        hours: c.hours,
        createdAt: c.createdAt,
        attendance: att ? att.status : null,
      };
    });
  }

  /** 成长档案时间轴（§6.5，需指定学员，且必须已绑定） */
  async myGrowth(tenantId: number, phone: string, studentId: number) {
    const ids = await this.boundStudentIds(tenantId, phone);
    if (!ids.includes(Number(studentId))) return [];
    return this.growthSvc.growthTimeline(tenantId, Number(studentId));
  }

  /** 我的缴费：绑定学员的订单（§11.6 家长端「缴费/续费」） */
  async myOrders(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    return this.orderRepo.find({
      where: { tenantId, studentId: In(studentIds) } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
  }

  /** 我的通知（绑定学员 + 全员通知，§6.6） */
  async myNotices(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    return this.familySvc.noticesForStudents(tenantId, studentIds);
  }

  /** 我的续费提醒（§6.6） */
  async myRenewals(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    const all = await this.familySvc.listRenewals(tenantId);
    const set = new Set(studentIds.map(Number));
    return all.filter((r) => set.has(Number(r.studentId)));
  }

  /** 发送验证码。非生产环境回传 code 便于联调与 e2e；生产仅返回已发送 */
  async sendOtp(d: SendOtpDto) {
    const now = Date.now();
    const prev = this.otpStore.get(d.phone);
    if (prev && now - prev.lastSentAt < OTP_RESEND_MS) {
      throw new BusinessException(ResCode.BAD_REQUEST, '发送过于频繁，请稍后再试');
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.otpStore.set(d.phone, { code, expireAt: now + OTP_TTL_MS, lastSentAt: now });
    const isProd = process.env.NODE_ENV === 'production';
    return { sent: true, phone: d.phone, code: isProd ? undefined : code };
  }

  /** 手机号 + OTP / 手机号后6位 登录/注册（§6.23） */
  async login(tenantId: number, d: ParentLoginDto) {
    if (d.last6 && !d.code) {
      // 后6位快捷登录：校验手机号末6位
      if (d.last6 !== d.phone.slice(-6)) {
        throw new UnauthorizedException('手机号后6位校验失败');
      }
    } else {
      const rec = this.otpStore.get(d.phone);
      if (!rec || rec.code !== d.code) {
        throw new UnauthorizedException('验证码错误');
      }
      if (Date.now() > rec.expireAt) {
        this.otpStore.delete(d.phone);
        throw new UnauthorizedException('验证码已过期');
      }
      this.otpStore.delete(d.phone);
    }

    let parent = await this.parentRepo.findOne({ where: { tenantId, phone: d.phone } as any });
    if (!parent) {
      parent = await this.parentRepo.save(
        this.parentRepo.create({ tenantId, phone: d.phone, name: '家长', status: 1 } as Parent),
      );
    }
    if (parent.status !== 1) throw new UnauthorizedException('账号已被禁用');
    parent.lastLoginAt = new Date();
    await this.parentRepo.save(parent as any);

    const base = {
      sub: parent.id,
      tenantId,
      username: parent.phone,
      kind: 'parent' as const,
      phone: parent.phone,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, type: 'access' }, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }),
      this.jwt.signAsync({ ...base, type: 'refresh' }, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
    ]);
    return {
      accessToken,
      refreshToken,
      parent: { id: parent.id, phone: parent.phone, name: parent.name, tenantId },
    };
  }

  /** 我的学员（多对多，§6.23） */
  async myStudents(tenantId: number, phone: string) {
    const rows = await this.spRepo.find({ where: { tenantId, phone } as any });
    const active = rows.filter((r) => !r.unboundAt);
    const ids = active.map((r) => Number(r.studentId));
    if (!ids.length) return [];
    const students = await this.stuRepo.find({ where: { tenantId, id: In(ids) } as any });
    const map = new Map(students.map((s) => [Number(s.id), s]));
    return active.map((r) => ({
      bindId: r.id,
      studentId: Number(r.studentId),
      studentName: map.get(Number(r.studentId))?.name || '',
      relation: r.relation,
      isMain: r.isMain,
      boundAt: r.boundAt,
    }));
  }

  /** 绑定学员 */
  async bind(tenantId: number, phone: string, d: BindStudentDto) {
    const student = await this.stuRepo.findOne({ where: { tenantId, id: d.studentId } as any });
    if (!student) throw new NotFoundException('学员不存在');
    const exists = await this.spRepo.findOne({
      where: { tenantId, phone, studentId: d.studentId } as any,
    });
    if (exists) {
      exists.unboundAt = undefined;
      exists.verified = 1;
      exists.boundAt = exists.boundAt || new Date();
      if (d.parentName) exists.parentName = d.parentName;
      if (d.relation) exists.relation = d.relation;
      return this.spRepo.save(exists as any);
    }
    const row = this.spRepo.create({
      tenantId,
      studentId: d.studentId,
      parentName: d.parentName || '家长',
      phone,
      relation: d.relation,
      isMain: 0,
      bindSource: 'otp',
      verified: 1,
      boundAt: new Date(),
    } as StudentParent);
    return this.spRepo.save(row as any);
  }

  /** 解绑学员（保留历史，§4.4） */
  async unbind(tenantId: number, phone: string, bindId: number) {
    const row = await this.spRepo.findOne({ where: { tenantId, id: bindId, phone } as any });
    if (!row) throw new NotFoundException('绑定关系不存在');
    row.unboundAt = new Date();
    return this.spRepo.save(row as any);
  }

  /** 家长可见的学员 ID 集合（用于业务接口越权校验） */
  async boundStudentIds(tenantId: number, phone: string): Promise<number[]> {
    const rows = await this.spRepo.find({ where: { tenantId, phone } as any });
    return rows.filter((r) => !r.unboundAt).map((r) => Number(r.studentId));
  }

  /** 我的校区列表（本品牌内：依据绑定学员所属校区聚合，供移动端校区切换） */
  async campuses(tenantId: number, phone: string) {
    const ids = await this.boundStudentIds(tenantId, phone);
    if (!ids.length) return [];
    const students = await this.stuRepo.find({ where: { tenantId, id: In(ids) } as any });
    const orgIds = [...new Set(students.map((s: any) => s.orgId).filter(Boolean))] as number[];
    if (!orgIds.length) return [];
    const orgs = await Promise.all(orgIds.map((id) => this.orgSvc.get(tenantId, id).catch(() => null)));
    return orgs
      .filter(Boolean)
      .map((o: any) => ({ orgId: o.id, name: o.name, type: o.type }));
  }

  /** 跨品牌发现：该手机号在哪些品牌域（租户）存在家长账号，供移动端跨平台切换 */
  async brands(phone: string) {
    const parents = await this.parentRepo.find({ where: { phone } as any });
    const tenantIds = [...new Set(parents.map((p) => p.tenantId))];
    const tenants = await Promise.all(
      tenantIds.map((id) => this.tenantSvc.get(id).catch(() => null)),
    );
    return tenants
      .filter(Boolean)
      .map((t: any) => ({ tenantId: t.id, slug: t.slug, name: t.name, domain: t.domain }));
  }

  /** 我的课表：按绑定学员所在班级的课次 */
  async myLessons(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    const enrolls = await this.scRepo.find({
      where: { tenantId, studentId: In(studentIds), status: StudentCourseStatus.ACTIVE } as any,
    });
    const cgIds = [...new Set(enrolls.map((e) => Number(e.classGroupId)).filter(Boolean))];
    if (!cgIds.length) return [];
    return this.lessonRepo.find({
      where: { tenantId, classGroupId: In(cgIds) } as any,
      order: { startTime: 'ASC' } as any,
      take: 50,
    });
  }

  /** 我的点评：绑定学员的课后点评（§6.6 / §11.6 家长端） */
  async myReviews(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    return this.reviewRepo.find({
      where: { tenantId, studentId: In(studentIds) } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
  }

  /** 我的作业：绑定学员所在班级的作业 + 各自提交状态（§4.7） */
  async myHomeworks(tenantId: number, phone: string) {
    const studentIds = await this.boundStudentIds(tenantId, phone);
    if (!studentIds.length) return [];
    const enrolls = await this.scRepo.find({
      where: { tenantId, studentId: In(studentIds), status: StudentCourseStatus.ACTIVE } as any,
    });
    const cgIds = [...new Set(enrolls.map((e) => Number(e.classGroupId)).filter(Boolean))];
    if (!cgIds.length) return [];
    const homeworks = await this.hwRepo.find({
      where: { tenantId, classGroupId: In(cgIds) } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
    const hwIds = homeworks.map((h) => h.id);
    const submits = hwIds.length
      ? await this.submitRepo.find({ where: { tenantId, homeworkId: In(hwIds) } as any })
      : [];
    const submitMap = new Map(
      submits.map((s) => [`${Number(s.homeworkId)}_${Number(s.studentId)}`, s]),
    );
    const stuMap = new Map(studentIds.map((id) => [id, id]));
    const result: any[] = [];
    for (const hw of homeworks) {
      for (const sid of studentIds) {
        if (!stuMap.has(sid)) continue;
        const sub = submitMap.get(`${Number(hw.id)}_${sid}`);
        result.push({
          homeworkId: hw.id,
          title: hw.title,
          content: hw.content,
          deadline: hw.deadline,
          studentId: sid,
          submitted: !!sub,
          submitId: sub?.id,
          submitAt: sub?.submitAt,
          isLate: sub?.isLate,
        });
      }
    }
    return result;
  }
}
