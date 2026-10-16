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
  private readonly rawRepo: Repository<ApprovalFlow>;
  constructor(
    @InjectRepository(ApprovalFlow) repo: Repository<ApprovalFlow>,
    @InjectRepository(User) userRepo: Repository<User>,
  ) {
    this.repo = orgRepo(repo);
    this.rawRepo = repo;
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

  /** 预置资金联动审批流模板（幂等：仅当该 bizType 无启用模板时创建）。
   *  节点按业务归属角色：资金类(储值/退款/套餐升级)→finance，教学类(调课/转班)→teacher；
   *  对应角色已在租户初始化时预置默认成员，保证待办有人可审。 */
  async seedDefaults(tenantId: number) {
    const presets: { bizType: string; name: string; role: string; nodeName: string }[] = [
      { bizType: 'STORED_VALUE_RECHARGE', name: '储值充值审批', role: 'finance', nodeName: '财务复核' },
      { bizType: 'STORED_VALUE_REFUND', name: '储值退回审批', role: 'finance', nodeName: '财务复核' },
      { bizType: 'REFUND', name: '订单退款审批', role: 'finance', nodeName: '财务复核' },
      { bizType: 'LESSON_RESCHEDULE', name: '调课审批', role: 'teacher', nodeName: '教学主管' },
      { bizType: 'CLASS_TRANSFER', name: '转班审批', role: 'teacher', nodeName: '教学主管' },
      { bizType: 'PACKAGE_UPGRADE', name: '套餐升级补差价审批', role: 'finance', nodeName: '财务复核' },
    ];
    const created: ApprovalFlow[] = [];
    for (const p of presets) {
      const exists = await this.rawRepo.findOne({
        where: { tenantId, bizType: p.bizType, enabled: 1 } as any,
      });
      if (exists) {
        // 幂等升级：仍是旧的 super_admin 单节点模板时，切换为对应业务角色（让预置成员可用）
        const nodes = (exists.nodesJson || []) as any[];
        const allSuperAdmin = nodes.length > 0
          && nodes.every((n) => n.approverType === 'ROLE' && n.approverRole === 'super_admin');
        if (allSuperAdmin) {
          exists.nodesJson = [{
            order: 0, name: p.nodeName, approverType: 'ROLE', approverRole: p.role, mode: 'OR',
          }];
          await this.rawRepo.save(exists);
          created.push(exists);
        }
        continue;
      }
      const flow = this.rawRepo.create({
        tenantId,
        bizType: p.bizType,
        name: p.name,
        enabled: 1,
        nodesJson: [{ order: 0, name: p.nodeName, approverType: 'ROLE', approverRole: p.role, mode: 'OR' }],
      } as ApprovalFlow);
      created.push(await this.rawRepo.save(flow as any));
    }
    return created;
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
