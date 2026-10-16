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
import { ApprovalFlowService } from './approval-flow.service';
import { approvalEvents } from '../../common/approval-events';

import { orgRepo } from '../../common/org-scope';

@Injectable()
export class ApprovalService {
  private readonly instanceRepo: Repository<ApprovalInstance>;
  private readonly nodeRepo: Repository<ApprovalNode>;
  constructor(
    @InjectRepository(ApprovalInstance)
    instanceRepo: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalNode)
    nodeRepo: Repository<ApprovalNode>,
    private readonly taskSvc: TaskService,
    private readonly auditSvc: AuditService,
    private readonly notifySvc: NotificationService,
    private readonly flowSvc: ApprovalFlowService,
  ) {
    this.instanceRepo = orgRepo(instanceRepo);
    this.nodeRepo = orgRepo(nodeRepo);
  }

  /** 发起审批：引用 flowId 自动套用节点，或直接指定 approverIds（向后兼容）。
   *  为当前节点审批人(集合)生成 APPROVAL 任务并入待办中心（§4.26 与审批打通）。 */
  async create(tenantId: number, d: CreateApprovalDto, applicant: AuthUser) {
    let sets: number[][];
    let nodeModes: ('AND' | 'OR')[] = [];
    if (d.flowId) {
      const flow = await this.flowSvc.detail(tenantId, d.flowId);
      sets = await this.flowSvc.resolveNodes(tenantId, flow.nodesJson || []);
      nodeModes = (flow.nodesJson || []).map((n) => n.mode || 'OR');
    } else {
      if (!d.approverIds?.length) {
        throw new BadRequestException('需指定审批人：flowId 或 approverIds 至少其一');
      }
      sets = d.approverIds.map((id) => [id]);
      nodeModes = d.approverIds.map(() => 'OR');
    }
    const inst = this.instanceRepo.create({
      tenantId,
      bizType: d.bizType,
      bizId: d.bizId,
      title: d.title,
      applicantId: applicant.id,
      applicantName: applicant.username,
      status: ApprovalStatus.PENDING,
      currentNode: 0,
      nodesJson: sets,
    } as ApprovalInstance);
    const saved = await this.instanceRepo.save(inst as any);
    for (let i = 0; i < sets.length; i++) {
      await this.nodeRepo.save(
        this.nodeRepo.create({
          tenantId,
          instanceId: saved.id,
          nodeKey: i,
          approverIdsJson: sets[i],
          approverId: sets[i].length === 1 ? sets[i][0] : undefined,
          mode: nodeModes[i] || 'OR',
          actedUserIds: [],
        } as any),
      );
    }
    await this.createNodeTasks(tenantId, saved, 0);
    await this.auditSvc.record({
      user: applicant,
      action: 'approval:create',
      target: 'approval_instance',
      bizId: saved.id,
      after: {
        bizType: d.bizType, title: d.title, flowId: d.flowId,
        nodes: sets.map((s) => s),
      },
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

  /**
   * 业务发起审批：默认套用已配置的审批流模板（按 bizType 查找 enabled 模板）。
   * 若未配置模板，退化到单节点 approverIds（fallbackApproverId 兜底）；两者皆无则报错，
   * 提示先到「审批流配置」设置模板（符合"默认走审批流模板"的要求）。
   */
  async createByBizType(
    tenantId: number,
    p: { bizType: string; bizId?: number; title: string; applicant: AuthUser; fallbackApproverId?: number },
  ) {
    const flow = await this.flowSvc.getByBizType(tenantId, p.bizType);
    if (flow) {
      return this.create(
        tenantId,
        { bizType: p.bizType, bizId: p.bizId, title: p.title, flowId: flow.id },
        p.applicant,
      );
    }
    if (p.fallbackApproverId) {
      return this.create(
        tenantId,
        { bizType: p.bizType, bizId: p.bizId, title: p.title, approverIds: [p.fallbackApproverId] },
        p.applicant,
      );
    }
    throw new BadRequestException(
      `业务类型 ${p.bizType} 未配置审批流模板，请在「审批流配置」中设置后再发起`,
    );
  }

  /** 为某节点集合内的每个可审批人生成待办任务（ROLE 节点会生成多个） */
  private async createNodeTasks(tenantId: number, inst: ApprovalInstance, nodeIndex: number) {
    const set = this.normalizeNodes(inst.nodesJson)[nodeIndex] || [];
    for (const uid of set) {
      await this.taskSvc.ensurePending(tenantId, {
        type: 'APPROVAL',
        title: `审批：${inst.title}`,
        assigneeId: uid,
        refType: 'APPROVAL_INSTANCE',
        refId: inst.id,
      });
    }
  }

  /** nodesJson 兼容 number[] 与 number[][] 两种历史格式 */
  private normalizeNodes(nodesJson?: number[][] | number[]): number[][] {
    if (!nodesJson || !nodesJson.length) return [];
    const first = nodesJson[0];
    if (Array.isArray(first)) return nodesJson as number[][];
    return (nodesJson as number[]).map((x) => [x]);
  }

  /** 我的审批待办：当前节点审批人集合包含我 的 PENDING 实例 */
  async getMyTodos(tenantId: number, userId: number) {
    const all = await this.instanceRepo.find({
      where: { tenantId, status: ApprovalStatus.PENDING } as any,
    });
    const todos: ApprovalInstance[] = [];
    for (const i of all) {
      const sets = this.normalizeNodes(i.nodesJson);
      const cur = sets[i.currentNode] || [];
      if (!cur.includes(userId)) continue;
      const node = await this.nodeRepo.findOne({
        where: { tenantId, instanceId: i.id, nodeKey: i.currentNode } as any,
      });
      const acted = node?.actedUserIds || [];
      // 会签未齐时，已审过的当前节点审批人不再出现在自己待办（等待其余审批人）
      if (acted.includes(userId)) continue;
      todos.push(i);
    }
    return todos;
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
    const sets = this.normalizeNodes(inst.nodesJson);
    const currentSet = sets[inst.currentNode] || [];
    if (!currentSet.includes(operator.id)) throw new ForbiddenException('非当前节点审批人');
    // 读取当前节点记录（含会签模式与会签累计的已审批人）
    const nodeRec = await this.nodeRepo.findOne({
      where: { tenantId, instanceId: id, nodeKey: inst.currentNode } as any,
    });
    const nodeMode: 'AND' | 'OR' = (nodeRec?.mode as any) || 'OR';
    const acted = (nodeRec?.actedUserIds || []).slice();
    if (!acted.includes(operator.id)) acted.push(operator.id);
    if (action === ApprovalAction.REJECT) {
      await this.nodeRepo.update(
        { tenantId, instanceId: id, nodeKey: inst.currentNode } as any,
        {
          action: ApprovalAction.REJECT,
          comment,
          actedAt: new Date(),
          approverId: operator.id,
          approverName: operator.username,
          actedUserIds: acted,
        } as any,
      );
      inst.status = ApprovalStatus.REJECTED;
      await this.instanceRepo.save(inst as any);
      this.emit('rejected', inst);
      // 关闭本实例全部待办（含 ROLE 节点多成员任务）
      await this.taskSvc.closeByRefAll(tenantId, 'APPROVAL_INSTANCE', id, 'APPROVAL', operator.id);
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
    // APPROVE：或签(OR)任一人通过即推进；会签(AND)需本节点全部审批人通过才推进
    const allApproved = nodeMode === 'OR' ? true : currentSet.every((u) => acted.includes(u));
    await this.nodeRepo.update(
      { tenantId, instanceId: id, nodeKey: inst.currentNode } as any,
      {
        comment,
        actedAt: new Date(),
        approverId: operator.id,
        approverName: operator.username,
        actedUserIds: acted,
        // 会签未齐时节点 action 保持空(待审)，仅累计已审批人；全员通过才标记通过
        ...(allApproved ? { action: ApprovalAction.APPROVE } : {}),
      } as any,
    );
    if (!allApproved) {
      // 会签未齐：仅记录本次审批，保持当前节点等待其余审批人
      await this.auditSvc.record({
        user: operator,
        action: 'approval:approve',
        target: 'approval_instance',
        bizId: id,
        after: { node: inst.currentNode, mode: nodeMode, pending: currentSet.length - acted.length, comment },
      });
      return inst;
    }
    if (inst.currentNode < sets.length - 1) {
      inst.currentNode += 1;
      await this.instanceRepo.save(inst as any);
      await this.taskSvc.closeByRefAll(tenantId, 'APPROVAL_INSTANCE', id, 'APPROVAL', operator.id);
      await this.createNodeTasks(tenantId, inst, inst.currentNode);
    } else {
      inst.status = ApprovalStatus.APPROVED;
      await this.instanceRepo.save(inst as any);
      this.emit('approved', inst);
      await this.taskSvc.closeByRefAll(tenantId, 'APPROVAL_INSTANCE', id, 'APPROVAL', operator.id);
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

  /** 审批终审后向业务模块广播（避免审批模块反向依赖业务模块造成循环依赖） */
  private emit(action: 'approved' | 'rejected', inst: ApprovalInstance) {
    approvalEvents.emit(`approval.${action}`, {
      tenantId: inst.tenantId,
      bizType: inst.bizType,
      bizId: inst.bizId,
      instanceId: inst.id,
      applicantId: inst.applicantId,
    });
  }
}
