import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsNumber, IsInt, IsDateString, Min, Max,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 创建测评（§6.5） */
export class CreateExamDto {
  @IsString() name: string;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() classGroupId?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) fullScore?: number;
  @IsOptional() @IsString() knowledgePoints?: string;
}

/** 录入成绩（§6.5） */
export class CreateScoreDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() lessonId?: number;
  @IsOptional() @Type(() => Number) @IsInt() examId?: number;
  @IsOptional() @IsString() type?: string;
  @Type(() => Number) @IsNumber() @Min(0) score: number;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() comment?: string;
}

/** 素养评价（§4.8） */
export class CreateGrowthMetricDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsString() dimension: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) score: number;
  @IsString() period: string;
}

/** 创建赛事（§6.5） */
export class CreateContestDto {
  @IsString() name: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() organizer?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) entryFee?: number;
}

export class JoinContestDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @IsString() team?: string;
  @IsOptional() @Type(() => Number) @IsInt() coachId?: number;
}

export class AwardDto {
  @IsString() grade: string;
  @IsOptional() @IsString() certificate?: string;
  @IsOptional() @IsString() photo?: string;
}

export class ScorePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() examId?: number;
}
