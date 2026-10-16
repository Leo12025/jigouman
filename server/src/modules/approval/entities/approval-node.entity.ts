import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/** 审批节点（§4.16：每个审批人一个节点，记录动作/意见/时间） */
@Entity({ name: 'approval_node' })
@Index(['tenantId', 'instanceId'])
export class ApprovalNode extends BaseEntity {
  @Column({ name: 'instance_id', type: 'bigint', comment: '审批实例' })
  instanceId: number;

  @Column({ name: 'node_key', type: 'int', comment: '节点序号' })
  nodeKey: number;

  @Column({ name: 'approver_id', type: 'bigint', nullable: true, comment: '实际审批人(动作产生后写入)' })
  approverId?: number;

  @Column({ name: 'approver_ids_json', type: 'json', nullable: true, comment: '本节点可审批人集合(userId 数组，ROLE 展开后；用户单人节点=单元素)' })
  approverIdsJson?: number[];

  @Column({ name: 'approver_name', length: 64, nullable: true })
  approverName?: string;

  @Column({ name: 'action', length: 16, nullable: true, comment: 'APPROVE/REJECT' })
  action?: string;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string;

  @Column({ name: 'acted_at', type: 'datetime', nullable: true })
  actedAt?: Date;

  /** 本节点审批模式：AND=会签(全部通过才推进) / OR=或签(任一通过即推进)，默认 OR */
  @Column({ name: 'mode', type: 'varchar', length: 8, default: 'OR', nullable: true, comment: '节点审批模式 AND会签/OR或签' })
  mode?: 'AND' | 'OR';

  /** 本节点已审批用户 ID 集合(会签累计；或签记录首批准人) */
  @Column({ name: 'acted_user_ids', type: 'json', nullable: true, comment: '本节点已审批用户ID集合' })
  actedUserIds?: number[];
}
