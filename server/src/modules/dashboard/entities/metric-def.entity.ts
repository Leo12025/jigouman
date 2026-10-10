import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

/** 动态指标定义（§4.10 看板增强：可配置指标 code/名称/单位/分类/启停，看板按 enabled 动态展示） */
@Entity('metric_defs')
export class MetricDef {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  tenantId: number;

  /** 指标编码，关联看板内置指标注册表（如 REVENUE_RECEIVED / ATTENDANCE_RATE） */
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  /** 适用角色：principal 经营 / admission 招生 / teaching 教学 / common 通用 */
  @Column({ type: 'varchar', length: 16, default: 'common' })
  category: 'principal' | 'admission' | 'teaching' | 'common';

  /** 单位，如 元 / % / 人 / 单 */
  @Column({ type: 'varchar', length: 16, nullable: true })
  unit?: string;

  @Column({ type: 'tinyint', default: 1 })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;
}
