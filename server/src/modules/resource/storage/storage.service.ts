import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { StorageDriver, StoredObject, UploadFileInput, UploadedFile } from './storage-driver.interface';
import { LocalStorageDriver } from './local.storage';
import { OssStorageDriver } from './oss.storage';

/**
 * 存储策略选择（文档 §4.1）：env STORAGE_TYPE=local|oss。
 * local：写入 UPLOAD_DIR，经 /files 公开。
 * oss：使用 ali-oss，URL 取 OSS_BASE_URL 或 SDK 返回。
 */
@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;

  constructor() {
    const type = (process.env.STORAGE_TYPE || 'local').toLowerCase();
    if (type === 'oss') {
      const cfg = {
        region: process.env.OSS_REGION || 'cn-hangzhou',
        bucket: process.env.OSS_BUCKET || '',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
        endpoint: process.env.OSS_ENDPOINT,
        baseUrl: process.env.OSS_BASE_URL,
        dir: process.env.OSS_DIR,
      };
      if (!cfg.bucket || !cfg.accessKeyId || !cfg.accessKeySecret) {
        throw new Error('OSS 存储已启用，但缺少 OSS_BUCKET/OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET 配置');
      }
      this.driver = new OssStorageDriver(cfg);
    } else {
      const root = path.resolve(process.env.UPLOAD_DIR || 'uploads');
      const base =
        process.env.PUBLIC_BASE_URL ||
        `http://localhost:${process.env.APP_PORT || 3000}`;
      this.driver = new LocalStorageDriver(root, base);
    }
  }

  get type(): 'local' | 'oss' {
    return this.driver.type;
  }

  buildKey(originalname: string, prefix?: string): string {
    const ext = path.extname(originalname) || '';
    const rand = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const name = `${rand}${ext}`;
    return prefix ? `${prefix.replace(/\/$/, '')}/${name}` : name;
  }

  save(file: UploadFileInput, prefix?: string): Promise<StoredObject> {
    return this.driver.save(file, this.buildKey(file.originalname, prefix));
  }

  /** 便捷：直接从 UploadedFile（multer）保存 */
  saveUploaded(file: UploadedFile, prefix?: string): Promise<StoredObject> {
    return this.save(
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      prefix,
    );
  }

  remove(key: string): Promise<void> {
    return this.driver.remove(key);
  }
}
