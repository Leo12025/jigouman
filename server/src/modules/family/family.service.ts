import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseReview } from './entities/course-review.entity';
import { CreateCourseReviewDto, ReviewPageQueryDto } from './dto/family.dto';
import { Notice } from './entities/notice.entity';
import { RenewalReminder } from './entities/renewal-reminder.entity';
import { CreateNoticeDto, NoticePageQueryDto, CreateRenewalReminderDto } from './dto/notice.dto';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/entities/task.entity';

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
    private readonly taskSvc: TaskService,
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
}
