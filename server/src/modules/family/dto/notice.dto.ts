import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsInt, IsDateString, IsIn,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 发送通知（§6.6） */
export class CreateNoticeDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsString() title: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() @IsIn(['APP', 'SMS', 'OA']) channel?: string;
}

export class NoticePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() type?: string;
}

/** 触发续费提醒（§6.6） */
export class CreateRenewalReminderDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @IsString() @IsIn(['LOW_HOURS', 'EXPIRE']) triggerType?: string;
  @IsOptional() @Type(() => Number) remainingHours?: number;
}
