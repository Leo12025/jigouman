import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class UploadQueryDto {
  /** 业务分类：syllabus/stage/courseware/avatar/doc */
  @IsOptional() @IsString() category?: string;
  /** 关联业务类型 */
  @IsOptional() @IsString() refType?: string;
  /** 关联业务 ID */
  @IsOptional() @Type(() => Number) @IsInt() refId?: number;
}

export class ResourcePageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @Type(() => Number) @IsInt() refId?: number;
  @IsOptional() @Type(() => Number) @IsInt() ownerId?: number;
  @IsOptional() @IsString() storageType?: 'local' | 'oss';
  @IsOptional() @IsString() keyword?: string;
}

export interface UploadMeta {
  ownerId?: number;
  category?: string;
  refType?: string;
  refId?: number;
}
