import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateOnlineClassDto {
  @IsString() title!: string;
  @Type(() => Number) @IsInt() @Min(1) teacherId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) courseId?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateOnlineClassDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teacherId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) courseId?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class CreateStudyRecordDto {
  @Type(() => Number) @IsInt() @Min(1) classId!: number;
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSec?: number;
  @IsOptional() @IsEnum(['PRESENT', 'LATE', 'ABSENT']) status?: 'PRESENT' | 'LATE' | 'ABSENT';
  @IsOptional() @IsString() note?: string;
}

export class TeachingPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teacherId?: number;
}
