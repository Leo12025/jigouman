import { BaseEntity } from '../../../common/base.entity';
import { Column, Entity } from 'typeorm';

/** 问卷回收（§4.22） */
@Entity({ name: 'survey_responses' })
export class SurveyResponse extends BaseEntity {
  @Column({ name: 'template_id', type: 'bigint' })
  templateId: number;

  @Column({ name: 'student_id', type: 'bigint', nullable: true })
  studentId?: number;

  /** NPS 0-10 评分 */
  @Column({ name: 'score', type: 'int', nullable: true })
  score?: number;

  @Column({ name: 'answers', type: 'simple-json', nullable: true })
  answers?: any[];

  @Column({ name: 'submitted_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;
}
