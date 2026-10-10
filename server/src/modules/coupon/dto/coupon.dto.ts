import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const COUPON_TYPES = ['DISCOUNT', 'AMOUNT', 'FREE_CLASS'] as const;

export class CreateCouponTemplateDto {
  @IsString() name!: string;
  @IsEnum(COUPON_TYPES) type!: string;
  @Type(() => Number) @IsNumber() value!: number;
  @IsOptional() @Type(() => Number) @IsNumber() minSpend?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableCourseIds?: number[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) validDays?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateCouponTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(COUPON_TYPES) type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minSpend?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableCourseIds?: number[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) validDays?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'DISABLED']) status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class GrantCouponDto {
  @Type(() => Number) @IsInt() @Min(1) templateId!: number;
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) count?: number;
}

export class CouponPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) templateId?: number;
  @IsOptional() @IsEnum(['UNUSED', 'USED', 'EXPIRED']) status?: string;
}

export class PreviewRedeemDto {
  @IsString() code!: string;
  @Type(() => Number) @IsNumber() amount!: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
}

export class RedeemCouponDto extends PreviewRedeemDto {
  @Type(() => Number) @IsInt() @Min(1) orderId!: number;
}
