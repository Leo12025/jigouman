import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalFlow, FlowNodeConfig } from './entities/approval-flow.entity';
import {
  CreateApprovalFlowDto, UpdateApprovalFlowDto, ApprovalFlowPageQueryDto,
} from './dto/approval-flow.dto';
import { User } from '../../core/rbac/user.entity';

/** 审批流模板服务（§4.16 审批中心增强：可视化配置、按业务类型复用） */
import { orgRepo } from '../../common/org-scope';

@Injectable()
export class ApprovalFlowService {
  private readonly repo: Repository<ApprovalFlow>;
  private readonly userRepo: Repository<User>;
  constructor(
    @InjectRepository(ApprovalFlow) repo: Repository<ApprovalFlow>,
    @InjectRepository(User) userRepo: Repository<User>,
  ) {
    this.repo = orgRepo(repo);
    this.userRepo = orgRepo(userRepo);
  }

  async create(tenantId: number, d: CreateApprovalFlowDto) {
    this.validateNodes(d.nodes);
    const flow = this.repo.create({
      tenantId,
      bizType: d.bizType,
      name: d.name,
      enabled: d.enabled === false ? 0 : 1,
      nodesJson: d.nodes,
    } as ApprovalFlow);
    return this.repo.save(flow as any);
  }

  async update(tenantId: number, id: number, d: UpdateApprovalFlowDto) {
    const flow = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!flow) throw new NotFoundException('审批流不存在');
    if (d.name !== undefined) flow.name = d.name;
    if (d.enabled !== undefined) flow.enabled = d.enabled ? 1 : 0;
    if (d.nodes !== undefined) {
      this.validateNodes(d.nodes);
      flow.nodesJson = d.nodes;
    }
    return this.repo.save(flow as any);
  }

  async remove(tenantId: number, id: number) {
    const flow = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!flow) throw new NotFoundException('审批流不存在');
    await this.repo.softRemove(flow as any);
    return { id };
  }

  async list(tenantId: number, q: ApprovalFlowPageQueryDto) {
    const where: any = { tenantId };
    if (q.bizType) where.bizType = q.bizType;
    if (q.status === 'enabled') where.enabled = 1;
    if (q.status === 'disabled') where.enabled = 0;
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' } as any,
      skip: (q.page - 1) * q.size,
      take: q.size,
    });
    return { list, total, page: q.page, size: q.size, totalPages: Math.ceil(total / q.size) };
  }

  async detail(tenantId: number, id: number) {
    const flow = await this.repo.findOne({ where: { tenantId, id } as any });
    if (!flow) throw new NotFoundException('审批流不存在');
    return flow;
  }

  async getByBizType(tenantId: number, bizType: string) {
    return this.repo.findOne({
      where: { tenantId, bizType, enabled: 1 } as any,
      order: { id: 'DESC' } as any,
    });
  }

  /** 将节点配置解析为审批人集合二维数组（ROLE 节点展开为角色下成员） */
  async resolveNodes(tenantId: number, nodes: FlowNodeConfig[]): Promise<number[][]> {
    this.validateNodes(nodes);
    const sets: number[][] = [];
    for (const n of nodes) {
      if (n.approverType === 'USER') {
        sets.push([n.approverId as number]);
      } else {
        const members = await this.userRepo
          .createQueryBuilder('u')
          .leftJoin('u.roles', 'r')
          .where('u.tenantId = :t', { t: tenantId })
          .andWhere('r.code = :code', { code: n.approverRole })
          .getMany();
        const ids = members.map((m) => m.id);
        if (!ids.length) {
          throw new BadRequestException(`节点「${n.name}」角色 ${n.approverRole} 下无成员`);
        }
        sets.push(ids);
      }
    }
    return sets;
  }

  private validateNodes(nodes?: FlowNodeConfig[]) {
    if (!nodes || !nodes.length) throw new BadRequestException('审批流至少需要一个节点');
    for (const n of nodes) {
      if (n.approverType === 'USER' && !n.approverId) {
        throw new BadRequestException(`节点「${n.name}」需指定审批用户`);
      }
      if (n.approverType === 'ROLE' && !n.approverRole) {
        throw new BadRequestException(`节点「${n.name}」需指定审批角色`);
      }
    }
  }
}
