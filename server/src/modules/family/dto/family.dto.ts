import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsInt, IsArray, Min, Max,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 课后点评（§6.6，支持 AI 生成需人工复核） */
export class CreateCourseReviewDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() lessonId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() audio?: string;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1) aiGenerated?: number;
}

export class ReviewPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() lessonId?: number;
}
