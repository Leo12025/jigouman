import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageDriver, StoredObject, UploadFileInput } from './storage-driver.interface';

/** 本地存储驱动：写入 UPLOAD_DIR，经 /files 静态路由公开访问 */
export class LocalStorageDriver implements StorageDriver {
  readonly type = 'local' as const;

  constructor(private readonly root: string, private readonly publicBaseUrl: string) {}

  async save(file: UploadFileInput, key: string): Promise<StoredObject> {
    const full = path.join(this.root, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer);
    const url = `${this.publicBaseUrl.replace(/\/$/, '')}/files/${key}`;
    return { key, url, size: file.size, mimeType: file.mimetype };
  }

  async remove(key: string): Promise<void> {
    await fs.rm(path.join(this.root, key), { force: true });
  }
}
