import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateStageDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsInt() outlineResourceId?: number;
  @IsOptional() @IsString() outlineUrl?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateStageDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsInt() outlineResourceId?: number;
  @IsOptional() @IsString() outlineUrl?: string;
  @IsOptional() @IsString() remark?: string;
}

export class CreateCoursewareDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsInt() resourceId?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
  /** 资源包：多文件 [{resourceId,url,name,size}] */
  @IsOptional() @IsArray() resources?: Record<string, any>[];
  @IsOptional() @IsString() remark?: string;
}

export class UpdateCoursewareDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsInt() resourceId?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
  @IsOptional() @IsArray() resources?: Record<string, any>[];
  @IsOptional() @IsString() remark?: string;
}

export class CoursewarePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() stageId?: number;
}
