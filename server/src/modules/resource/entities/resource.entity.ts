import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

/** 统一资源（文档 §4.1 课件/大纲/头像等文件）：本地或 OSS 存储，集中管理 */
@Entity({ name: 'resource' })
@Index(['tenantId', 'category'])
@Index(['tenantId', 'refType', 'refId'])
export class Resource extends BaseEntity {
  /** 上传者（员工/管理员） */
  @Column({ name: 'owner_id', type: 'bigint', nullable: true, comment: '上传者' })
  ownerId?: number;

  @Column({ name: 'original_name', length: 255, comment: '原始文件名' })
  originalName: string;

  /** 存储 key / 相对路径（本地为相对 uploads 的路径，OSS 为 object key） */
  @Column({ name: 'storage_key', length: 512, comment: '存储 key' })
  key: string;

  @Column({ name: 'storage_type', length: 16, comment: 'local / oss' })
  storageType: 'local' | 'oss';

  @Column({ name: 'bucket', length: 128, nullable: true, comment: 'OSS bucket' })
  bucket?: string;

  @Column({ name: 'mime_type', length: 128, nullable: true, comment: 'MIME' })
  mimeType?: string;

  @Column({ name: 'ext', length: 16, nullable: true, comment: '扩展名' })
  ext?: string;

  @Column({ name: 'size', type: 'bigint', default: 0, comment: '字节数' })
  size: number;

  /** 公开访问 URL */
  @Column({ name: 'url', length: 512, comment: '访问 URL' })
  url: string;

  /** 业务分类：syllabus 大纲 / stage 阶段大纲 / courseware 课件 / avatar 头像 / doc 其他 */
  @Column({ name: 'category', length: 32, default: 'other', comment: '分类' })
  category: string;

  /** 关联业务类型（如 course_stage / courseware） */
  @Column({ name: 'ref_type', length: 32, nullable: true })
  refType?: string;

  @Column({ name: 'ref_id', type: 'bigint', nullable: true })
  refId?: number;
}
