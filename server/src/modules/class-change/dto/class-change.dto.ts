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
  /** 审批人(兜底)：未配置审批流模板时作为单节点审批人，配置模板后优先走模板 */
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
