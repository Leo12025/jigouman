import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const ALERT_OPERATORS = ['GT', 'LT', 'GTE', 'LTE'] as const;

export class CreateAlertRuleDto {
  @IsString() name!: string;
  @IsString() metric!: string;
  @IsOptional() @IsString() operator?: string;
  @Type(() => Number) @IsNumber() threshold!: number;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsArray() @IsNumber(undefined, { each: true }) receivers?: number[];
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateAlertRuleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() metric?: string;
  @IsOptional() @IsString() operator?: string;
  @IsOptional() @Type(() => Number) @IsNumber() threshold?: number;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsArray() @IsNumber(undefined, { each: true }) receivers?: number[];
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() remark?: string;
}

export class CheckAlertDto {
  /** 当前各指标值，如 { ARREARS_AMOUNT: 5000, ATTENDANCE_RATE: 0.6 } */
  @IsObject()
  metrics!: Record<string, number>;
}

export class AlertPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() metric?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
