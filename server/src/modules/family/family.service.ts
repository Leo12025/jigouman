import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseReview } from './entities/course-review.entity';
import { CreateCourseReviewDto, ReviewPageQueryDto } from './dto/family.dto';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/entities/task.entity';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(CourseReview) private readonly repo: Repository<CourseReview>,
    private readonly taskSvc: TaskService,
  ) {}

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
