import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 合同模板（§4.23 电子签：系统自带保底签署） */
@Entity({ name: 'contract_templates' })
export class ContractTemplate extends BaseEntity {
  @Column({ name: 'name', length: 128 })
  name: string;

  /** ENROLL 报名 / EMPLOYEE 兼职 / NDA 保密 / OTHER */
  @Column({ name: 'type', length: 32, default: 'ENROLL' })
  type: string;

  /** 合同正文模板（支持 {name}{idCard}{amount} 等占位） */
  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
