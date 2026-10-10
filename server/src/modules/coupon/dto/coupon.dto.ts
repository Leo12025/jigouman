import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const COUPON_TYPES = [
  'DISCOUNT', 'AMOUNT', 'FULL_REDUCTION', 'FREE_CLASS', 'GIFT', 'FLASH',
] as const;

export class TierDto {
  @Type(() => Number) @IsNumber() threshold!: number;
  @Type(() => Number) @IsNumber() minus!: number;
}

export class GiftRuleDto {
  @Type(() => Number) @IsInt() @Min(1) buyQty!: number;
  @Type(() => Number) @IsInt() @Min(1) giftQty!: number;
  @Type(() => Number) @IsInt() @Min(1) giftCourseId!: number;
  @IsOptional() @IsString() giftName?: string;
}

export class CreateCouponTemplateDto {
  @IsString() name!: string;
  @IsEnum(COUPON_TYPES) type!: string;
  @IsOptional() @Type(() => Number) @IsNumber() value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSpend?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableCourseIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableClassGroupIds?: number[];
  @IsOptional() @IsArray() @IsString({ each: true }) applicableStudentTags?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TierDto) tiers?: TierDto[];
  @IsOptional() @ValidateNested() @Type(() => GiftRuleDto) giftRule?: GiftRuleDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @IsIn([0, 1]) stackable?: number;
  @IsOptional() @IsString() stackGroup?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxStack?: number;
  @IsOptional() @Type(() => Number) @IsInt() priority?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @IsIn([0, 1]) autoApply?: number;
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
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSpend?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableCourseIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) applicableClassGroupIds?: number[];
  @IsOptional() @IsArray() @IsString({ each: true }) applicableStudentTags?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TierDto) tiers?: TierDto[];
  @IsOptional() @ValidateNested() @Type(() => GiftRuleDto) giftRule?: GiftRuleDto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @IsIn([0, 1]) stackable?: number;
  @IsOptional() @IsString() stackGroup?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxStack?: number;
  @IsOptional() @Type(() => Number) @IsInt() priority?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @IsIn([0, 1]) autoApply?: number;
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
  @IsOptional() @IsEnum(COUPON_TYPES) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @IsIn([0, 1]) autoApply?: number;
}

export class CalcPromotionItemDto {
  @Type(() => Number) @IsInt() @Min(1) courseId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) classGroupId?: number;
  @Type(() => Number) @IsInt() @Min(1) qty!: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice!: number;
}

export class CalcPromotionDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CalcPromotionItemDto) items?: CalcPromotionItemDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) studentTags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) codes?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeAuto?: boolean;
}

export class PreviewRedeemDto {
  @IsString() code!: string;
  @Type(() => Number) @IsNumber() amount!: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
}

export class RedeemCouponDto extends PreviewRedeemDto {
  @Type(() => Number) @IsInt() @Min(1) orderId!: number;
}
