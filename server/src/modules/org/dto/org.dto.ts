import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const ORG_TYPES = ['HQ', 'BRANCH', 'CAMPUS'] as const;

export class CreateOrgDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @IsOptional() @IsEnum(ORG_TYPES) type?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sort?: number;
  @IsOptional() @IsString() status?: string;
}

export class UpdateOrgDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @IsOptional() @IsEnum(ORG_TYPES) type?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sort?: number;
  @IsOptional() @IsString() status?: string;
}

export class OrgPageQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(ORG_TYPES) type?: string;
  @IsOptional() @IsString() keyword?: string;
}
