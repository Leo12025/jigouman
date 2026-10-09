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

  @Column({ name: 'approver_id', type: 'bigint', comment: '审批人' })
  approverId: number;

  @Column({ name: 'approver_name', length: 64, nullable: true })
  approverName?: string;

  @Column({ name: 'action', length: 16, nullable: true, comment: 'APPROVE/REJECT' })
  action?: string;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string;

  @Column({ name: 'acted_at', type: 'datetime', nullable: true })
  actedAt?: Date;
}
