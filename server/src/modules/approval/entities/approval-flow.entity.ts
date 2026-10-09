import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 审批流节点配置（存于 approval_flow.nodes_json） */
export interface FlowNodeConfig {
  /** 节点顺序（从 0 开始） */
  order: number;
  /** 节点名称，如「部门主管」「财务复核」 */
  name: string;
  /** 审批人类型：指定用户 / 指定角色(角色下成员均可审批) */
  approverType: 'USER' | 'ROLE';
  /** approverType=USER 时的用户 ID */
  approverId?: number;
  /** approverType=ROLE 时的角色编码 */
  approverRole?: string;
}

/**
 * 审批流模板（§4.16 审批中心增强：可复用、可视化配置的审批链）。
 * 按业务类型(biz_type)组织，发起审批时引用 flow_id 自动套用节点，
 * 避免每次手写 approverIds（节点/审批人自定义、可启停）。
 */
@Entity({ name: 'approval_flow' })
@Index(['tenantId', 'bizType'])
export class ApprovalFlow extends BaseEntity {
  @Column({ name: 'biz_type', length: 32, comment: '业务类型(如 REFUND/TRANSFER/DISCOUNT)' })
  bizType: string;

  @Column({ name: 'name', length: 100, comment: '审批流名称' })
  name: string;

  @Column({ name: 'enabled', type: 'tinyint', default: 1, comment: '是否启用 1/0' })
  enabled: number;

  @Column({ name: 'nodes_json', type: 'json', nullable: true, comment: '审批节点配置数组(FlowNodeConfig[])' })
  nodesJson?: FlowNodeConfig[];
}
