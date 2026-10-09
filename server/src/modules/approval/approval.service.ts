import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalInstance, ApprovalStatus } from './entities/approval-instance.entity';
import { ApprovalNode, ApprovalAction } from './entities/approval-node.entity';
import { CreateApprovalDto, ApprovalPageQueryDto } from './dto/approval.dto';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { TaskService } from '../task/task.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalInstance)
    private readonly instanceRepo: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalNode)
    private readonly nodeRepo: Repository<ApprovalNode>,
    private readonly taskSvc: TaskService,
    private readonly auditSvc: AuditService,
    private readonly notifySvc: NotificationService,
  ) {}

  /** 发起审批：创建实例+节点，为当前节点审批人生成 APPROVAL 任务并入待办中心（§4.26 与审批打通） */
  async create(tenantId: number, d: CreateApprovalDto, applicant: AuthUser) {
    if (!d.approverIds?.length) throw new BadRequestException('至少需要一个审批人');
    const inst = this.instanceRepo.create({
      tenantId,
      bizType: d.bizType,
      bizId: d.bizId,
      title: d.title,
      applicantId: applicant.id,
      applicantName: applicant.username,
      status: ApprovalStatus.PENDING,
      currentNode: 0,
      nodesJson: d.approverIds,
    } as ApprovalInstance);
    const saved = await this.instanceRepo.save(inst as any);
    for (let i = 0; i < d.approverIds.length; i++) {
      await this.nodeRepo.save(
        this.nodeRepo.create({
          tenantId,
          instanceId: saved.id,
          nodeKey: i,
          approverId: d.approverIds[i],
        } as ApprovalNode),
      );
    }
    await this.taskSvc.ensurePending(tenantId, {
      type: 'APPROVAL',
      title: `审批：${d.title}`,
      assigneeId: d.approverIds[0],
      refType: 'APPROVAL_INSTANCE',
      refId: saved.id,
    });
    await this.auditSvc.record({
      user: applicant,
      action: 'approval:create',
      target: 'approval_instance',
      bizId: saved.id,
      after: { bizType: d.bizType, title: d.title, approvers: d.approverIds },
    });
    await this.notifySvc
      .create(tenantId, {
        userId: applicant.id,
        type: 'APPROVAL_RESULT',
        title: '审批已发起',
        content: `您发起的审批「${d.title}」已提交，等待审批`,
      })
      .catch(() => undefined);
    return saved;
  }

  /** 我的审批待办：当前节点审批人=我的 PENDING 实例 */
  async getMyTodos(tenantId: number, userId: number) {
    const all = await this.instanceRepo.find({
      where: { tenantId, status: ApprovalStatus.PENDING } as any,
    });
    return all.filter((i) => (i.nodesJson || [])[i.currentNode] === userId);
  }

  async detail(tenantId: number, id: number) {
    const inst = await this.instanceRepo.findOne({ where: { tenantId, id } as any });
    if (!inst) throw new NotFoundException('审批实例不存在');
    const nodes = await this.nodeRepo.find({
      where: { tenantId, instanceId: id } as any,
      order: { nodeKey: 'ASC' } as any,
    });
    return { ...(inst as any), nodes };
  }

  async list(tenantId: number, q: ApprovalPageQueryDto) {
    const where: any = { tenantId };
    if (q.status) where.status = q.status;
    if (q.bizType) where.bizType = q.bizType;
    const [list, total] = await this.instanceRepo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async approve(tenantId: number, id: number, operator: AuthUser, comment?: string) {
    return this.act(tenantId, id, operator, ApprovalAction.APPROVE, comment);
  }

  async reject(tenantId: number, id: number, operator: AuthUser, comment?: string) {
    return this.act(tenantId, id, operator, ApprovalAction.REJECT, comment);
  }

  private async act(
    tenantId: number,
    id: number,
    operator: AuthUser,
    action: ApprovalAction,
    comment?: string,
  ) {
    const inst = await this.instanceRepo.findOne({ where: { tenantId, id } as any });
    if (!inst) throw new NotFoundException('审批实例不存在');
    if (inst.status !== ApprovalStatus.PENDING) throw new BadRequestException('审批已结束');
    const nodes = inst.nodesJson || [];
    const currentApprover = nodes[inst.currentNode];
    if (currentApprover !== operator.id) throw new ForbiddenException('非当前节点审批人');
    await this.nodeRepo.update(
      { tenantId, instanceId: id, nodeKey: inst.currentNode } as any,
      {
        action,
        comment,
        actedAt: new Date(),
        approverId: operator.id,
        approverName: operator.username,
      } as any,
    );
    if (action === ApprovalAction.REJECT) {
      inst.status = ApprovalStatus.REJECTED;
      await this.instanceRepo.save(inst as any);
      await this.taskSvc.closeByRef(tenantId, 'APPROVAL', 'APPROVAL_INSTANCE', id, operator.id);
      await this.notifySvc
        .create(tenantId, {
          userId: inst.applicantId,
          type: 'APPROVAL_RESULT',
          title: '审批驳回',
          content: `审批「${inst.title}」已被驳回${comment ? '：' + comment : ''}`,
        })
        .catch(() => undefined);
      await this.auditSvc.record({
        user: operator,
        action: 'approval:reject',
        target: 'approval_instance',
        bizId: id,
        after: { comment },
      });
      return inst;
    }
    // APPROVE：推进节点或终审
    if (inst.currentNode < nodes.length - 1) {
      inst.currentNode += 1;
      await this.instanceRepo.save(inst as any);
      await this.taskSvc.ensurePending(tenantId, {
        type: 'APPROVAL',
        title: `审批：${inst.title}`,
        assigneeId: nodes[inst.currentNode],
        refType: 'APPROVAL_INSTANCE',
        refId: id,
      });
    } else {
      inst.status = ApprovalStatus.APPROVED;
      await this.instanceRepo.save(inst as any);
      await this.taskSvc.closeByRef(tenantId, 'APPROVAL', 'APPROVAL_INSTANCE', id, operator.id);
      await this.notifySvc
        .create(tenantId, {
          userId: inst.applicantId,
          type: 'APPROVAL_RESULT',
          title: '审批通过',
          content: `审批「${inst.title}」已通过`,
        })
        .catch(() => undefined);
    }
    await this.auditSvc.record({
      user: operator,
      action: 'approval:approve',
      target: 'approval_instance',
      bizId: id,
      after: { node: inst.currentNode, comment },
    });
    return inst;
  }
}
