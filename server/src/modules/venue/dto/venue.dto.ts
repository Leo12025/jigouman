import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const CLASSROOM_STATUS = ['ACTIVE', 'DISABLED'] as const;

export class CreateClassroomDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) equipment?: string[];
  @IsOptional() @IsEnum(CLASSROOM_STATUS) status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateClassroomDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) equipment?: string[];
  @IsOptional() @IsEnum(CLASSROOM_STATUS) status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class ClassroomPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsEnum(CLASSROOM_STATUS) status?: string;
  @IsOptional() @IsString() keyword?: string;
}
