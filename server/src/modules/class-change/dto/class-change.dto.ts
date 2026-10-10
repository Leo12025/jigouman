import { Type } from 'class-transformer';
import {
  IsDate, IsInt, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateClassTransferDto {
  @IsInt() studentId: number;
  @IsInt() fromClassGroupId: number;
  @IsInt() toClassGroupId: number;
  @IsOptional() @IsNumber() @Min(0) diffAmount?: number;
  @IsOptional() @IsString() reason?: string;
  /** 审批人(单节点审批)；不传则审批中心要求显式指定 */
  @IsOptional() @IsInt() approverId?: number;
}

export class CreateLessonRescheduleDto {
  @IsInt() lessonId: number;
  @Type(() => Date) @IsDate() newStartTime: Date;
  @Type(() => Date) @IsDate() newEndTime: Date;
  @IsOptional() @IsInt() newTeacherId?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsInt() approverId?: number;
}
