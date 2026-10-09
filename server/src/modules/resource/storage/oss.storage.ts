import { StorageDriver, StoredObject, UploadFileInput } from './storage-driver.interface';

export interface OssConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  /** 自定义 endpoint（如阿里云 OSS 自定义域名 / 内网域名） */
  endpoint?: string;
  /** 公开访问基础 URL（Bucket 已配置公共读或 CDN） */
  baseUrl?: string;
  /** key 前缀目录，如 'jigouman' */
  dir?: string;
}

/**
 * 阿里云 OSS 驱动：延迟 require 'ali-oss'（仅 STORAGE_TYPE=oss 时才会加载），
 * 避免本地模式强依赖该 SDK。使用前请 `npm i ali-oss`。
 */
export class OssStorageDriver implements StorageDriver {
  readonly type = 'oss' as const;
  private client: any;

  constructor(private readonly cfg: OssConfig) {}

  private getClient(): any {
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OSS = require('ali-oss');
      this.client = new OSS({
        region: this.cfg.region,
        bucket: this.cfg.bucket,
        accessKeyId: this.cfg.accessKeyId,
        accessKeySecret: this.cfg.accessKeySecret,
        endpoint: this.cfg.endpoint,
        cname: !!this.cfg.endpoint,
      });
    }
    return this.client;
  }

  private withDir(key: string): string {
    const dir = (this.cfg.dir || '').replace(/\/$/, '');
    return dir ? `${dir}/${key}` : key;
  }

  async save(file: UploadFileInput, key: string): Promise<StoredObject> {
    const k = this.withDir(key);
    const res = await this.getClient().put(k, file.buffer);
    const url = this.cfg.baseUrl
      ? `${this.cfg.baseUrl.replace(/\/$/, '')}/${k}`
      : res.url;
    return { key: k, url, size: file.size, mimeType: file.mimetype, bucket: this.cfg.bucket };
  }

  async remove(key: string): Promise<void> {
    await this.getClient().delete(key);
  }
}
