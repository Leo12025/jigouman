import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 问卷/满意度模板（§4.22） */
@Entity({ name: 'survey_templates' })
export class SurveyTemplate extends BaseEntity {
  @Column({ name: 'title', length: 128 })
  title: string;

  /** NPS / SATISFACTION / QUESTIONNAIRE */
  @Column({ name: 'type', length: 32, default: 'SATISFACTION' })
  type: string;

  /** 题目: [{ label, qtype:'SINGLE'|'MULTI'|'TEXT', options?:string[] }] */
  @Column({ name: 'questions', type: 'simple-json', nullable: true })
  questions?: any[];

  /** 投放场景: AFTER_CLASS / TRIAL / ANNUAL */
  @Column({ name: 'target_type', length: 32, nullable: true })
  targetType?: string;

  @Column({ name: 'status', length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark?: string;
}
