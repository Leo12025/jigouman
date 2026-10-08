import {
  IsArray, IsInt, IsNotEmpty, IsIn, IsOptional, IsString, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/dto/pagination.dto';
import { AttendanceStatus } from '../entities/attendance.entity';
import { HourAccountType } from '../entities/hour-account.entity';
import { HourConsumeType } from '../entities/hour-consumption.entity';

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
  @IsOptional() @IsIn(['ONE_ON_ONE', 'CLASS', 'GENERAL'] as const) type?: HourAccountType;
  @IsInt() @Min(1) hours: number;
  @IsOptional() @IsString() remark?: string;
}

export class HourAccountPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @IsIn(['ONE_ON_ONE', 'CLASS', 'GENERAL'] as const) type?: HourAccountType;
}

export class HourConsumptionPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() accountId?: number;
  @IsOptional() @IsIn(['GRANT', 'CONSUME', 'FREEZE', 'ROLLBACK', 'EXPIRE'] as const) type?: HourConsumeType;
}
