import {
  Injectable, NotFoundException, BadRequestException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassTransfer, ClassTransferStatus } from './entities/class-transfer.entity';
import { LessonReschedule } from './entities/lesson-reschedule.entity';
import { CreateClassTransferDto, CreateLessonRescheduleDto } from './dto/class-change.dto';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { ClassGroup } from '../course/entities/class-group.entity';
import { ApprovalService } from '../approval/approval.service';
import { OrderService } from '../order/order.service';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { approvalEvents, ApprovalEventPayload } from '../../common/approval-events';

/**
 * 调课/转班业务。两者均通过审批中心流转（仅系统内生效，不关联外部账户）：
 * 创建即生成审批实例 → 审批中心终审 → 事件总线回写业务效果（§4 资金联动）。
 */
import { orgRepo } from '../../common/org-scope';

@Injectable()
export class ClassChangeService implements OnModuleInit {
  private readonly transferRepo: Repository<ClassTransfer>;
  private readonly reschedRepo: Repository<LessonReschedule>;
  private readonly scRepo: Repository<StudentCourse>;
  private readonly lessonRepo: Repository<Lesson>;
  private readonly cgRepo: Repository<ClassGroup>;
  constructor(
    @InjectRepository(ClassTransfer) transferRepo: Repository<ClassTransfer>,
    @InjectRepository(LessonReschedule) reschedRepo: Repository<LessonReschedule>,
    @InjectRepository(StudentCourse) scRepo: Repository<StudentCourse>,
    @InjectRepository(Lesson) lessonRepo: Repository<Lesson>,
    @InjectRepository(ClassGroup) cgRepo: Repository<ClassGroup>,
    private readonly approval: ApprovalService,
    private readonly order: OrderService,
  ) {
    this.transferRepo = orgRepo(transferRepo);
    this.reschedRepo = orgRepo(reschedRepo);
    this.scRepo = orgRepo(scRepo);
    this.lessonRepo = orgRepo(lessonRepo);
    this.cgRepo = orgRepo(cgRepo);
  }

  onModuleInit() {
    approvalEvents.on('approval.approved', (p: ApprovalEventPayload) => {
      if (p.bizType === 'CLASS_TRANSFER') this.applyTransfer(p.tenantId, p.bizId).catch(() => undefined);
      if (p.bizType === 'LESSON_RESCHEDULE') this.applyReschedule(p.tenantId, p.bizId).catch(() => undefined);
    });
    approvalEvents.on('approval.rejected', (p: ApprovalEventPayload) => {
      if (p.bizType === 'CLASS_TRANSFER') this.rejectTransfer(p.tenantId, p.bizId).catch(() => undefined);
      if (p.bizType === 'LESSON_RESCHEDULE') this.rejectReschedule(p.tenantId, p.bizId).catch(() => undefined);
    });
  }

  async createTransfer(tenantId: number, d: CreateClassTransferDto, applicant: AuthUser) {
    if (d.fromClassGroupId === d.toClassGroupId) {
      throw new BadRequestException('原班级与目标班级不能相同');
    }
    const e = this.transferRepo.create({
      tenantId,
      ...(d as any),
      status: ClassTransferStatus.PENDING,
    } as ClassTransfer);
    const saved = await this.transferRepo.save(e as any);
    const inst = await this.approval.createByBizType(tenantId, {
      bizType: 'CLASS_TRANSFER',
      bizId: saved.id,
      title: `转班申请-学员${d.studentId}-${d.fromClassGroupId}→${d.toClassGroupId}`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.transferRepo.save(saved as any);
    return saved;
  }

  async createReschedule(tenantId: number, d: CreateLessonRescheduleDto, applicant: AuthUser) {
    const e = this.reschedRepo.create({
      tenantId,
      ...(d as any),
      status: 'PENDING',
    } as LessonReschedule);
    const saved = await this.reschedRepo.save(e as any);
    const inst = await this.approval.createByBizType(tenantId, {
      bizType: 'LESSON_RESCHEDULE',
      bizId: saved.id,
      title: `调课申请-课次${d.lessonId}`,
      applicant,
      fallbackApproverId: d.approverId,
    });
    saved.approvalInstanceId = inst.id;
    await this.reschedRepo.save(saved as any);
    return saved;
  }

  private async applyTransfer(tenantId: number, id?: number) {
    if (!id) return;
    const e = await this.transferRepo.findOne({ where: { tenantId, id } as any });
    if (!e || e.status !== ClassTransferStatus.PENDING) return;
    const sc = await this.scRepo.findOne({
      where: { tenantId, studentId: e.studentId, classGroupId: e.fromClassGroupId } as any,
    });
    if (sc) {
      sc.classGroupId = e.toClassGroupId;
      await this.scRepo.save(sc as any);
    }
    // 资金联动：补差价在审批通过后生成系统内应收订单（不对接外部支付账户）
    const diff = Number(e.diffAmount) || 0;
    if (diff > 0) {
      const cg = await this.cgRepo.findOne({ where: { tenantId, id: e.toClassGroupId } as any });
      await this.order.createOrder(tenantId, {
        studentId: e.studentId,
        items: [
          { courseId: cg?.courseId ?? 0, name: '转班补差价', qty: 1, unitPrice: diff, hours: 0 },
        ],
      });
    }
    e.status = ClassTransferStatus.DONE;
    await this.transferRepo.save(e as any);
  }

  private async rejectTransfer(tenantId: number, id?: number) {
    if (!id) return;
    const e = await this.transferRepo.findOne({ where: { tenantId, id } as any });
    if (!e || e.status !== ClassTransferStatus.PENDING) return;
    e.status = ClassTransferStatus.REJECTED;
    await this.transferRepo.save(e as any);
  }

  private async applyReschedule(tenantId: number, id?: number) {
    if (!id) return;
    const e = await this.reschedRepo.findOne({ where: { tenantId, id } as any });
    if (!e || e.status !== 'PENDING') return;
    const lesson = await this.lessonRepo.findOne({ where: { tenantId, id: e.lessonId } as any });
    if (lesson) {
      lesson.startTime = e.newStartTime;
      lesson.endTime = e.newEndTime;
      if (e.newTeacherId) lesson.teacherId = e.newTeacherId;
      await this.lessonRepo.save(lesson as any);
    }
    e.status = 'DONE';
    await this.reschedRepo.save(e as any);
  }

  private async rejectReschedule(tenantId: number, id?: number) {
    if (!id) return;
    const e = await this.reschedRepo.findOne({ where: { tenantId, id } as any });
    if (!e || e.status !== 'PENDING') return;
    e.status = 'REJECTED';
    await this.reschedRepo.save(e as any);
  }

  async listTransfers(tenantId: number, q: any) {
    const where: any = { tenantId };
    const page = q?.page || 1;
    const size = q?.size || 20;
    const [list, total] = await this.transferRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }

  async listReschedules(tenantId: number, q: any) {
    const where: any = { tenantId };
    const page = q?.page || 1;
    const size = q?.size || 20;
    const [list, total] = await this.reschedRepo.findAndCount({
      where, order: { id: 'DESC' } as any, skip: (page - 1) * size, take: size,
    });
    return { list, total, page, size, totalPages: Math.ceil(total / size) };
  }
}
