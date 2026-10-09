/** 存储驱动统一接口（本地 / OSS 可插拔，文档 §4.1 统一资源管理） */
export interface StoredObject {
  key: string;
  url: string;
  size: number;
  mimeType?: string;
  bucket?: string;
}

export interface UploadFileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** 上传文件结构（避免强依赖 @types/multer） */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageDriver {
  readonly type: 'local' | 'oss';
  save(file: UploadFileInput, key: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}
