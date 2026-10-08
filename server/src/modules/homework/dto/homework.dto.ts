import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsNumber, IsInt, IsDateString, IsArray, Min, Max, IsIn,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 布置作业（§4.7：按课次/班级，支持文字/图片/音频/附件） */
export class CreateHomeworkDto {
  @IsOptional() @Type(() => Number) @IsInt() lessonId?: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() teacherId?: number;
  @IsString() title: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() attachments?: string[];
  @IsOptional() @IsDateString() deadline?: string;
}

export class HomeworkPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() lessonId?: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @IsString() status?: string;
}

/** 提交作业（家长/学员端） */
export class SubmitHomeworkDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsArray() files?: string[];
}

/** 批改（§4.7：打分、评语、标注错误） */
export class ReviewHomeworkDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1000) score?: number;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsArray() attachments?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @IsIn([0, 1]) isExcellent?: number;
}

export class SubmitPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() homeworkId?: number;
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() status?: string;
}
