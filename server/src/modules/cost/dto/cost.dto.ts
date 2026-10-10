import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const COST_CATEGORIES = ['RENT', 'SALARY', 'MATERIAL', 'MARKETING', 'OTHER'] as const;

export class CreateCostDto {
  @IsEnum(COST_CATEGORIES) category!: string;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) attachResId?: number;
}

export class UpdateCostDto {
  @IsOptional() @IsEnum(COST_CATEGORIES) category?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) attachResId?: number;
}

export class CostPageQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(COST_CATEGORIES) category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
}
