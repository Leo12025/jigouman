import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';
import { HourGrantType } from '../../hour/entities/hour-account.entity';

export class CreateCoursePackageDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() code?: string;

  /** 售卖形态 */
  @IsOptional()
  @IsIn(['SINGLE', 'HOUR_PACK', 'COMBO', 'PERIOD_COURSE', 'TIME_CARD', 'DEPOSIT'] as const)
  sellType?: 'SINGLE' | 'HOUR_PACK' | 'COMBO' | 'PERIOD_COURSE' | 'TIME_CARD' | 'DEPOSIT';

  /** 消耗模式：决定发放到课时账户 / 时间权益 / 班期报名 */
  @IsOptional()
  @IsIn(['BY_HOUR', 'BY_TIME', 'BY_PERIOD'] as const)
  consumeMode?: 'BY_HOUR' | 'BY_TIME' | 'BY_PERIOD';

  /** 适用范围：通用包(跨课程共用课时池) / 限定包 */
  @IsOptional()
  @IsIn(['ALL_COURSE', 'SPECIFIED_COURSE'] as const)
  scopeType?: 'ALL_COURSE' | 'SPECIFIED_COURSE';

  @IsInt() @Min(0) totalHours: number;
  @IsOptional() @IsInt() @Min(0) validDays?: number;
  /** 期课绑定的班期（BY_PERIOD） */
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  /** 适用人群：ALL 全部 / NEW 仅新签 / RETURNING 仅老生续费专享 */
  @IsOptional() @IsIn(['ALL', 'NEW', 'RETURNING'] as const) audience?: 'ALL' | 'NEW' | 'RETURNING';
  @IsOptional() @IsNumber() @Min(0) listPrice?: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateCoursePackageDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional()
  @IsIn(['SINGLE', 'HOUR_PACK', 'COMBO', 'PERIOD_COURSE', 'TIME_CARD', 'DEPOSIT'] as const)
  sellType?: 'SINGLE' | 'HOUR_PACK' | 'COMBO' | 'PERIOD_COURSE' | 'TIME_CARD' | 'DEPOSIT';
  @IsOptional()
  @IsIn(['BY_HOUR', 'BY_TIME', 'BY_PERIOD'] as const)
  consumeMode?: 'BY_HOUR' | 'BY_TIME' | 'BY_PERIOD';
  @IsOptional()
  @IsIn(['ALL_COURSE', 'SPECIFIED_COURSE'] as const)
  scopeType?: 'ALL_COURSE' | 'SPECIFIED_COURSE';
  @IsOptional() @IsInt() @Min(0) totalHours?: number;
  @IsOptional() @IsInt() @Min(0) validDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @IsIn(['ALL', 'NEW', 'RETURNING'] as const) audience?: 'ALL' | 'NEW' | 'RETURNING';
  @IsOptional() @IsNumber() @Min(0) listPrice?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() remark?: string;
}

export class AddPackageCoursesDto {
  @IsArray() @IsInt({ each: true }) @IsNotEmpty({ each: true }) courseIds: number[];
}

/** 阶梯规格：同一套餐 30/60 课时两档，单价递减 */
export class PackageTierDto {
  @IsInt() @Min(1) hours: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsInt() sort?: number;
}

export class SetPackageTiersDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PackageTierDto) tiers: PackageTierDto[];
}

/** 组合套餐子项：每个子项有各自固定课时数（区别于通用包共用池） */
export class PackageItemDto {
  @IsInt() @IsNotEmpty() courseId: number;
  /** 该子项固定课时；为空表示仅圈定范围（通用包语义） */
  @IsOptional() @IsInt() @Min(1) hours?: number;
  @IsOptional() @IsInt() seq?: number;
}

export class SetPackageItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PackageItemDto) items: PackageItemDto[];
}

/** 差异化定价：按校区 / 老师级别 / 班型 */
export class PackagePriceRuleDto {
  @IsIn(['CAMPUS', 'TEACHER_LEVEL', 'CLASS_TYPE', 'AUDIENCE'] as const)
  dimension: 'CAMPUS' | 'TEACHER_LEVEL' | 'CLASS_TYPE' | 'AUDIENCE';
  @IsString() @IsNotEmpty() dimValue: string;
  @IsNumber() @Min(0) price: number;
}

export class SetPackagePriceRulesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PackagePriceRuleDto) rules: PackagePriceRuleDto[];
}

export class PurchasePackageDto {
  @IsInt() @IsNotEmpty() studentId: number;
  /** 发放课时，默认取套餐 totalHours（或所选阶梯档位） */
  @IsOptional() @IsInt() @Min(1) hours?: number;
  /** 阶梯档位 ID（选中档位决定课时与价格） */
  @IsOptional() @IsInt() tierId?: number;
  @IsOptional() @IsInt() orderId?: number;
  @IsOptional() @IsInt() orderItemId?: number;
  /** GIFT 即赠课（独立成户，退费不计入） */
  @IsOptional() @IsIn(['PAID', 'GIFT', 'TRANSFER', 'ROLLBACK'] as const) grantType?: HourGrantType;
}

export class CoursePackagePageQueryDto extends PageQueryDto {
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() keyword?: string;
}
