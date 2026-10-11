import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

export type ContractStatus = 'DRAFT' | 'SIGNED' | 'INVALID';

/** 合同实例（§4.23）：实名 + 手写签名 + 存证链，无需第三方即可用 */
@Entity({ name: 'contracts' })
export class Contract extends BaseEntity {
  /** 归属校区(org_id)：校区独立隔离键，空=租户级(总校区可见) */
  @Column({ name: 'org_id', type: 'bigint', nullable: true })
  orgId?: number;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId: number;

  @Column({ name: 'student_id', type: 'bigint', nullable: true })
  studentId?: number;

  /** 签约方姓名（实名） */
  @Column({ name: 'party_name', length: 64 })
  partyName: string;

  /** 证件号（实名认证） */
  @Column({ name: 'id_card', length: 32, nullable: true })
  idCard?: string;

  @Column({ name: 'status', length: 16, default: 'DRAFT' })
  status: ContractStatus;

  @Column({ name: 'signed_at', type: 'datetime', nullable: true })
  signedAt?: Date;

  /** 手写签名图片资源(resource.id) */
  @Column({ name: 'signature_res_id', type: 'bigint', nullable: true })
  signatureResId?: number;

  /** 电子印章资源(resource.id) */
  @Column({ name: 'seal_res_id', type: 'bigint', nullable: true })
  sealResId?: number;

  /** 存证链：{ algorithm, hash, signedAt, nonce } */
  @Column({ name: 'evidence', type: 'simple-json', nullable: true })
  evidence?: { algorithm: string; hash: string; signedAt: string; nonce: string };

  /** 关联业务：ENROLL(orderId) / EMPLOYEE 等 */
  @Column({ name: 'related_type', length: 32, nullable: true })
  relatedType?: string;

  @Column({ name: 'related_id', type: 'bigint', nullable: true })
  relatedId?: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
