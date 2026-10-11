import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { MONEY } from '../../order/entities/order.entity';

export enum InvoiceStatus {
  APPLIED = 'APPLIED', // 已申请(待开具)
  ISSUED = 'ISSUED', // 已开具
}

/**
 * 发票（文档 §4.5）。电子发票申请与开具，本地记录 + 状态模拟（不接税控 API）。
 */
@Entity({ name: 'invoice' })
@Index(['tenantId', 'orderId'])
export class Invoice extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'order_id', type: 'bigint', comment: '订单' })
  orderId: number;

  @Column({ name: 'student_id', type: 'bigint', comment: '学员' })
  studentId: number;

  @Column({ name: 'type', length: 16, default: 'ELECTRONIC', comment: '发票类型' })
  type: string;

  @Column({ name: 'title', length: 128, comment: '发票抬头' })
  title: string;

  @Column({ name: 'tax_no', length: 32, nullable: true, comment: '税号' })
  taxNo?: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, transformer: MONEY, comment: '开票金额' })
  amount: number;

  @Column({ name: 'status', length: 12, default: InvoiceStatus.APPLIED, comment: '状态' })
  status: InvoiceStatus;

  @Column({ name: 'invoice_no', length: 32, nullable: true, comment: '发票号码' })
  invoiceNo?: string;

  @Column({ name: 'issued_at', type: 'datetime', nullable: true, comment: '开具时间' })
  issuedAt?: Date;

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark?: string;
}
