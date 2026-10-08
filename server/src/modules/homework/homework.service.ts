import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { Homework, HomeworkStatus } from './entities/homework.entity';
import { HomeworkSubmit, SubmitStatus } from './entities/homework-submit.entity';
import { HomeworkReview } from './entities/homework-review.entity';
import {
  CreateHomeworkDto, HomeworkPageQueryDto, SubmitHomeworkDto, ReviewHomeworkDto, SubmitPageQueryDto,
} from './dto/homework.dto';
import { StudentCourse, StudentCourseStatus } from '../student/entities/student-course.entity';
import { Student } from '../student/entities/student.entity';
import { Lesson } from '../course/entities/lesson.entity';

@Injectable()
export class HomeworkService {
  constructor(
    @InjectRepository(Homework) private readonly hwRepo: Repository<Homework>,
    @InjectRepository(HomeworkSubmit) private readonly submitRepo: Repository<HomeworkSubmit>,
    @InjectRepository(HomeworkReview) private readonly reviewRepo: Repository<HomeworkReview>,
    @InjectRepository(StudentCourse) private readonly scRepo: Repository<StudentCourse>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
  ) {}

  /** 布置作业（§4.7）。按班级布置时，若未传 courseId 则尝试从课次/班级补全 */
  async create(tenantId: number, d: CreateHomeworkDto, operatorId?: number) {
    let courseId = d.courseId;
    let classGroupId = d.classGroupId;
    if (d.lessonId && (!courseId || !classGroupId)) {
      const lesson = await this.lessonRepo.findOne({ where: { tenantId, id: d.lessonId } as any });
      if (lesson) {
        courseId = courseId ?? lesson.courseId;
        classGroupId = classGroupId ?? lesson.classGroupId;
      }
    }
    const hw = this.hwRepo.create({
      tenantId,
      lessonId: d.lessonId,
      classGroupId,
      courseId,
      teacherId: d.teacherId ?? operatorId,
      title: d.title,
      content: d.content,
      attachments: d.attachments ? JSON.stringify(d.attachments) : undefined,
      deadline: d.deadline ? new Date(d.deadline) : undefined,
      status: HomeworkStatus.PUBLISHED,
    } as Homework);
    return this.hwRepo.save(hw as any);
  }

  async list(tenantId: number, q: HomeworkPageQueryDto) {
    const where: any = { tenantId };
    if (q.lessonId) where.lessonId = q.lessonId;
    if (q.classGroupId) where.classGroupId = q.classGroupId;
    if (q.courseId) where.courseId = q.courseId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.hwRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async detail(tenantId: number, id: number) {
    const hw = await this.hwRepo.findOne({ where: { tenantId, id } as any });
    if (!hw) throw new NotFoundException('作业不存在');
    const submits = await this.submitRepo.find({ where: { tenantId, homeworkId: id } as any });
    const submitIds = submits.map((s) => s.id);
    const reviews = submitIds.length
      ? await this.reviewRepo.find({ where: { tenantId, submitId: In(submitIds) } as any })
      : [];
    const reviewMap = new Map(reviews.map((r) => [Number(r.submitId), r]));
    return {
      ...hw,
      submits: submits.map((s) => ({ ...s, review: reviewMap.get(Number(s.id)) || null })),
    };
  }

  /** 提交作业（家长/学员端）。超过截止时间标记逾期 */
  async submit(tenantId: number, homeworkId: number, d: SubmitHomeworkDto) {
    const hw = await this.hwRepo.findOne({ where: { tenantId, id: homeworkId } as any });
    if (!hw) throw new NotFoundException('作业不存在');
    if (hw.status === HomeworkStatus.CLOSED) {
      throw new BusinessException(ResCode.BAD_REQUEST, '作业已截止');
    }
    const now = new Date();
    const isLate = hw.deadline ? now.getTime() > new Date(hw.deadline).getTime() : false;
    let rec = await this.submitRepo.findOne({
      where: { tenantId, homeworkId, studentId: d.studentId } as any,
    });
    if (!rec) {
      rec = this.submitRepo.create({
        tenantId, homeworkId, studentId: d.studentId,
      } as HomeworkSubmit);
    }
    rec.content = d.content;
    rec.files = d.files ? JSON.stringify(d.files) : undefined;
    rec.submitAt = now;
    rec.isLate = isLate ? 1 : 0;
    rec.status = rec.status === SubmitStatus.REVIEWED ? SubmitStatus.REVIEWED : SubmitStatus.SUBMITTED;
    return this.submitRepo.save(rec as any);
  }

  /** 批改（§4.7：打分、写评语、标注错误、标记优秀） */
  async review(tenantId: number, submitId: number, d: ReviewHomeworkDto, teacherId?: number) {
    const sub = await this.submitRepo.findOne({ where: { tenantId, id: submitId } as any });
    if (!sub) throw new NotFoundException('提交记录不存在');
    let rv = await this.reviewRepo.findOne({ where: { tenantId, submitId } as any });
    if (!rv) {
      rv = this.reviewRepo.create({
        tenantId,
        submitId,
        homeworkId: sub.homeworkId,
        studentId: sub.studentId,
      } as HomeworkReview);
    }
    if (d.score !== undefined) rv.score = d.score;
    if (d.comment !== undefined) rv.comment = d.comment;
    if (d.attachments) rv.attachments = JSON.stringify(d.attachments);
    if (d.isExcellent !== undefined) rv.isExcellent = d.isExcellent;
    rv.teacherId = teacherId ?? rv.teacherId;
    rv.reviewedAt = new Date();
    const saved = await this.reviewRepo.save(rv as any);
    sub.status = SubmitStatus.REVIEWED;
    await this.submitRepo.save(sub as any);
    return saved;
  }

  async listSubmits(tenantId: number, q: SubmitPageQueryDto) {
    const where: any = { tenantId };
    if (q.homeworkId) where.homeworkId = q.homeworkId;
    if (q.studentId) where.studentId = q.studentId;
    if (q.status) where.status = q.status;
    const [list, total] = await this.submitRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 应提交人数：按班级在读学员计算（§4.7 统计口径） */
  private async expectedStudentIds(tenantId: number, hw: Homework): Promise<number[]> {
    if (!hw.classGroupId) return [];
    const rows = await this.scRepo.find({
      where: { tenantId, classGroupId: hw.classGroupId, status: StudentCourseStatus.ACTIVE } as any,
    });
    return rows.map((r) => Number(r.studentId));
  }

  /** 统计看板：提交率 / 优秀率 / 按时率（§4.7） */
  async stats(tenantId: number, id: number) {
    const hw = await this.hwRepo.findOne({ where: { tenantId, id } as any });
    if (!hw) throw new NotFoundException('作业不存在');
    const expected = await this.expectedStudentIds(tenantId, hw);
    const submits = await this.submitRepo.find({ where: { tenantId, homeworkId: id } as any });
    const reviews = await this.reviewRepo.find({ where: { tenantId, homeworkId: id } as any });
    const total = expected.length || submits.length; // 无班级时以实际提交数为分母
    const submitted = submits.length;
    const onTime = submits.filter((s) => !s.isLate).length;
    const reviewed = submits.filter((s) => s.status === SubmitStatus.REVIEWED).length;
    const excellent = reviews.filter((r) => r.isExcellent).length;
    const rate = (n: number, d2: number) => (d2 > 0 ? Math.round((n / d2) * 1000) / 10 : 0);
    return {
      homeworkId: id,
      title: hw.title,
      expectedCount: total,
      submittedCount: submitted,
      reviewedCount: reviewed,
      onTimeCount: onTime,
      excellentCount: excellent,
      submitRate: rate(submitted, total),
      onTimeRate: rate(onTime, submitted),
      excellentRate: rate(excellent, submitted),
    };
  }

  /** 未提交名单（§4.7 提醒：未提交作业自动提醒学员/家长） */
  async unsubmitted(tenantId: number, id: number) {
    const hw = await this.hwRepo.findOne({ where: { tenantId, id } as any });
    if (!hw) throw new NotFoundException('作业不存在');
    const expected = await this.expectedStudentIds(tenantId, hw);
    const submits = await this.submitRepo.find({ where: { tenantId, homeworkId: id } as any });
    const done = new Set(submits.map((s) => Number(s.studentId)));
    const pending = expected.filter((sid) => !done.has(sid));
    if (!pending.length) return [];
    const students = await this.stuRepo.find({ where: { tenantId, id: In(pending) } as any });
    return students.map((s) => ({ id: s.id, name: s.name }));
  }
}
