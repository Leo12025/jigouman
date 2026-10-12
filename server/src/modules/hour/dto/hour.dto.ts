import {
  IsArray, IsInt, IsNotEmpty, IsIn, IsOptional, IsString, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/dto/pagination.dto';
import { AttendanceStatus } from '../entities/attendance.entity';
import { HourAccountType, HourGrantType, HourAccountStatus } from '../entities/hour-account.entity';
import { HourConsumeType, ConfirmStatus } from '../entities/hour-consumption.entity';
import { JoinType } from '../entities/enrollment.entity';

export class AttendRecordDto {
  @IsInt() @IsNotEmpty() studentId: number;
  @IsIn(['PRESENT', 'ABSENT', 'LEAVE', 'MAKEUP'] as const) status: AttendanceStatus;
}

export class AttendLessonDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendRecordDto) records: AttendRecordDto[];
}

export class LeaveLessonDto {
  @IsInt() @IsNotEmpty() studentId: number;
}

export class GrantHourDto {
  @IsInt() @IsNotEmpty() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() packageId?: number;
  @IsOptional() @IsIn(['ONE_ON_ONE', 'CLASS', 'GENERAL'] as const) type?: HourAccountType;
  @IsInt() @Min(1) hours: number;
  @IsOptional() @IsString() remark?: string;
  /** 有效期天数（不传=长期有效） */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) validDays?: number;
  /** 发放来源：GIFT 即赠课（独立成户，优先消耗、退费不计入） */
  @IsOptional() @IsIn(['PAID', 'GIFT', 'TRANSFER', 'ROLLBACK'] as const) grantType?: HourGrantType;
  /** 课时单价（退费/分账用） */
  @IsOptional() @Type(() => Number) unitValue?: number;
}

export class HourAccountPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @IsIn(['ONE_ON_ONE', 'CLASS', 'GENERAL'] as const) type?: HourAccountType;
  @IsOptional() @IsIn(['ACTIVE', 'FROZEN', 'EXPIRED', 'CLOSED'] as const) status?: HourAccountStatus;
}

export class HourConsumptionPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() accountId?: number;
  @IsOptional() @IsIn(['GRANT', 'CONSUME', 'FREEZE', 'ROLLBACK', 'EXPIRE'] as const) type?: HourConsumeType;
  @IsOptional() @IsIn(['PENDING', 'CONFIRMED', 'REJECTED'] as const) confirmStatus?: ConfirmStatus;
}

/** 补课排课（§4.6） */
export class ScheduleMakeupDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  @Type(() => Number) @IsInt() @IsNotEmpty() courseId: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
  @IsNotEmpty() startTime: string;
  @IsNotEmpty() endTime: string;
}

/** 时间型权益发放（BY_TIME：年卡/月卡/托班时段卡） */
export class GrantEntitlementDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() packageId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsNotEmpty() expireAt: string;
  @IsOptional() @IsString() startAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() refOrderId?: number;
}

/** 期课报名（BY_PERIOD：绑定班期，支持插班折减） */
export class EnrollDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() packageId?: number;
  @IsOptional() @IsIn(['FULL', 'LATE'] as const) joinType?: JoinType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) discountHours?: number;
  @IsOptional() @Type(() => Number) discountAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalLessons?: number;
  @IsOptional() @Type(() => Number) @IsInt() refOrderId?: number;
}

/** 停课/复课/结课：账户级生命周期操作 */
export class AccountActionDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() accountId: number;
}

/** 延期申请（示范合同要求：口头承诺落到书面） */
export class ExtendExpiryDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() accountId: number;
  @Type(() => Number) @IsInt() @Min(1) days: number;
}

/** 家长确认消课（一课一消） */
export class ConfirmConsumptionDto {
  @IsIn(['PENDING', 'CONFIRMED', 'REJECTED'] as const) status: ConfirmStatus;
}
