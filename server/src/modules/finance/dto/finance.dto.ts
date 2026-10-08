import { Type } from 'class-transformer';
import {
  IsOptional, IsNumber, IsString, IsDateString, Min, IsIn, IsInt,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 分账配置（tenant 级一条） */
export class UpsertSplitConfigDto {
  @IsOptional() @IsNumber() @Min(0) teacherRate?: number;
  @IsOptional() @IsNumber() @Min(0) channelRate?: number;
  @IsOptional() @IsNumber() @Min(0) bonusRate?: number;
}

export class SplitPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() period?: string;
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
}

export class SettleSplitDto {
  @IsOptional() @IsString() period?: string;
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
  @IsOptional() @Type(() => Array<number>) ids?: number[];
}

export class GenerateSalaryDto {
  @IsString() period: string; // YYYY-MM
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
}

export class SalaryPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() period?: string;
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
  @IsOptional() @IsString() status?: string;
}

export class ApplyInvoiceDto {
  @Type(() => Number) @IsInt() orderId: number;
  @Type(() => Number) @IsInt() studentId: number;
  @IsString() title: string;
  @IsOptional() @IsString() taxNo?: string;
  @IsOptional() @Type(() => Number) @Min(0) amount?: number;
  @IsOptional() @IsString() remark?: string;
}

export class InvoicePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() orderId?: number;
  @IsOptional() @IsString() status?: string;
}

export class FinanceSummaryQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
