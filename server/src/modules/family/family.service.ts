import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { CourseReview } from './entities/course-review.entity';
import { CreateCourseReviewDto, ReviewPageQueryDto } from './dto/family.dto';
import { Notice } from './entities/notice.entity';
import { RenewalReminder } from './entities/renewal-reminder.entity';
import { CreateNoticeDto, NoticePageQueryDto, CreateRenewalReminderDto } from './dto/notice.dto';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/entities/task.entity';
import { AiService } from '../../common/ai/ai.service';
import { Attendance } from '../hour/entities/attendance.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class FamilyService {
  private readonly repo: Repository<CourseReview>;
  private readonly noticeRepo: Repository<Notice>;
  private readonly renewalRepo: Repository<RenewalReminder>;
  constructor(
    @InjectRepository(CourseReview) repo: Repository<CourseReview>,
    @InjectRepository(Notice) noticeRepo: Repository<Notice>,
    @InjectRepository(RenewalReminder) renewalRepo: Repository<RenewalReminder>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly taskSvc: TaskService,
    private readonly aiSvc: AiService,
  ) {
    this.repo = orgRepo(repo);
    this.noticeRepo = orgRepo(noticeRepo);
    this.renewalRepo = orgRepo(renewalRepo);
  }

  // ---------- 通知（§5.7 / §6.6） ----------
  /** 发送通知。家长端按绑定学员可见（studentId 为空表示全员通知） */
  async createNotice(tenantId: number, d: CreateNoticeDto) {
    const notice = this.noticeRepo.create({
      tenantId,
      type: d.type || 'SYSTEM',
      studentId: d.studentId,
      title: d.title,
      content: d.content,
      channel: d.channel || 'APP',
      sendAt: new Date(),
      status: 'SENT',
    } as Notice);
    return this.noticeRepo.save(notice as any);
  }

  async listNotices(tenantId: number, q: NoticePageQueryDto) {
    const where: any = { tenantId };
    if (q.studentId) where.studentId = q.studentId;
    if (q.type) where.type = q.type;
    const [list, total] = await this.noticeRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 家长端：我的通知（绑定学员 + 全员通知） */
  async noticesForStudents(tenantId: number, studentIds: number[]) {
    if (!studentIds.length) return [];
    return this.noticeRepo.find({
      where: [
        { tenantId, studentId: In(studentIds) } as any,
        { tenantId, studentId: null } as any,
      ],
      order: { id: 'DESC' } as any,
      take: 50,
    });
  }

  async markNoticeRead(tenantId: number, id: number) {
    const n = await this.noticeRepo.findOne({ where: { tenantId, id } as any });
    if (!n) return null;
    n.status = 'READ';
    n.readAt = new Date();
    return this.noticeRepo.save(n as any);
  }

  // ---------- 续费提醒（§5.7 / §6.6） ----------
  async createRenewalReminder(tenantId: number, d: CreateRenewalReminderDto) {
    const r = this.renewalRepo.create({
      tenantId,
      studentId: d.studentId,
      courseId: d.courseId,
      triggerType: d.triggerType || 'LOW_HOURS',
      sentAt: new Date(),
      status: 'SENT',
      remainingHours: d.remainingHours,
    } as RenewalReminder);
    return this.renewalRepo.save(r as any);
  }

  async listRenewals(tenantId: number, studentId?: number) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.renewalRepo.find({ where, order: { id: 'DESC' } as any, take: 100 });
  }

  /**
   * 撰写课后点评（§6.6）。
   * 与 M4 打通：写完点评后自动完成该课次的"待写课后点评"待办（§4.26）。
   */
  async createReview(tenantId: number, d: CreateCourseReviewDto, teacherId?: number) {
    const review = this.repo.create({
      tenantId,
      studentId: d.studentId,
      lessonId: d.lessonId,
      courseId: d.courseId,
      teacherId,
      content: d.content,
      audio: d.audio,
      photos: d.photos ? JSON.stringify(d.photos) : undefined,
      rating: d.rating,
      aiGenerated: d.aiGenerated ?? 0,
    } as CourseReview);
    const saved = await this.repo.save(review as any);

    // 完成该课次的课后点评待办
    if (d.lessonId) {
      const pending = await this.taskSvc.list(tenantId, {
        type: 'AFTER_CLASS_REVIEW',
        refType: 'LESSON',
        refId: d.lessonId,
        status: TaskStatus.TODO,
        page: 1,
        size: 50,
      });
      for (const t of pending.list) {
        await this.taskSvc.complete(tenantId, t.id, teacherId).catch(() => undefined);
      }
    }
    return saved;
  }

  async listByStudent(tenantId: number, studentId: number, q: ReviewPageQueryDto) {
    const where: any = { tenantId, studentId };
    if (q.lessonId) where.lessonId = q.lessonId;
    const [list, total] = await this.repo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (q.page - 1) * q.size, take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  /** 家长端：按绑定学员批量查点评 */
  async listByStudents(tenantId: number, studentIds: number[]) {
    if (!studentIds.length) return [];
    return this.repo.find({
      where: { tenantId, studentId: In(studentIds) } as any,
      order: { id: 'DESC' } as any,
      take: 50,
    });
  }

  // ---------------- AI 课后点评草稿（§11.8，人工复核兜底） ----------------
  /**
   * 生成课后点评草稿（不直接落库）：基于学员近期出勤/作业/成绩聚合，给出客观描述，
   * 可选 LLM 润色为自然语言点评。教师需复核后调用 createReview 正式提交（aiGenerated 标记）。
   */
  async draftReview(
    tenantId: number,
    d: { studentId: number; classGroupId?: number; lessonId?: number },
  ): Promise<{ draft: string; aiPowered: boolean; facts: Record<string, any> }> {
    const attRepo = this.ds.getRepository(Attendance);
    const hsRepo = this.ds.getRepository(HomeworkSubmit);

    const attWhere: any = { tenantId, studentId: d.studentId };
    if (d.lessonId) attWhere.lessonId = d.lessonId;
    const atts = await attRepo.find({ where: attWhere, order: { id: 'DESC' } as any, take: 30 });
    const present = atts.filter((a) => (a as any).status === 'PRESENT').length;
    const late = atts.filter((a) => (a as any).status === 'LATE').length;
    const absent = atts.filter((a) => (a as any).status === 'ABSENT').length;

    const hsWhere: any = { tenantId, studentId: d.studentId };
    const subs = await hsRepo.find({ where: hsWhere, order: { id: 'DESC' } as any, take: 30 });
    const submitted = subs.filter((s) => (s as any).status === 'SUBMITTED' || (s as any).status === 'REVIEWED').length;
    const reviewed = subs.filter((s) => (s as any).status === 'REVIEWED').length;
    const hwLate = subs.filter((s) => (s as any).isLate).length;

    const facts = { present, late, absent, submitted, reviewed, hwLate, lessonId: d.lessonId, classGroupId: d.classGroupId };
    let draft =
      `学员近期上课 ${atts.length} 次（出勤 ${present} / 迟到 ${late} / 缺勤 ${absent}），` +
      `作业提交 ${submitted} 份（已批改 ${reviewed} / 迟交 ${hwLate}）。`;

    const llm = await this.aiSvc.llm(
      '你是耐心专业的少儿课程老师，基于学员客观表现写一段 80 字以内的课后点评草稿，先肯定亮点再给一个具体改进建议。语言温暖、具体、不夸大。',
      `出勤${present}次迟到${late}次缺勤${absent}次；作业提交${submitted}份已批改${reviewed}份迟交${hwLate}份。`,
    );
    if (llm) draft = llm;

    return { draft, aiPowered: this.aiSvc.enabled, facts };
  }
}
