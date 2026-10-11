import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * 审批实例（文档 §4.16 审批中心）。
 * 与业务单据强关联(biz_type+biz_id)，当前节点审批人由 nodes_json[当前节点] 决定。
 */
@Entity({ name: 'approval_instance' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'bizType', 'bizId'])
export class ApprovalInstance extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'biz_type', length: 32, comment: '业务类型(如 REFUND/TRANSFER/DISCOUNT)' })
  bizType: string;

  @Column({ name: 'biz_id', type: 'bigint', nullable: true, comment: '业务单据ID' })
  bizId?: number;

  @Column({ name: 'title', length: 200, comment: '审批标题' })
  title: string;

  @Column({ name: 'applicant_id', type: 'bigint', comment: '发起人' })
  applicantId: number;

  @Column({ name: 'applicant_name', length: 64, nullable: true })
  applicantName?: string;

  @Column({ name: 'status', length: 16, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @Column({ name: 'current_node', type: 'int', default: 0, comment: '当前节点序号' })
  currentNode: number;

  @Column({ name: 'nodes_json', type: 'json', nullable: true, comment: '审批节点集合(二维：每个节点=一组可审批人 userId 数组，支持 ROLE 会展开为多人)' })
  nodesJson?: number[][];
}
