import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';import { CourseType } from '../entities/course.entity';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCourseCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() parentId?: number;
  @IsOptional() @IsInt() sort?: number;
}

export class UpdateCourseCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() parentId?: number;
  @IsOptional() @IsInt() sort?: number;
}

export class CreateCourseDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsIn(Object.values(CourseType)) type: CourseType;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsInt() totalHours?: number;
  @IsOptional() @IsInt() validDays?: number;
  @IsOptional() @IsInt() status?: number;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsIn(Object.values(CourseType)) type?: CourseType;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsInt() totalHours?: number;
  @IsOptional() @IsInt() validDays?: number;
  @IsOptional() @IsInt() status?: number;
}

export class CreateClassGroupDto {
  @IsInt() courseId: number;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() teacherId?: number;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() scheduleJson?: Record<string, any>;
}

export class UpdateClassGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() teacherId?: number;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() scheduleJson?: Record<string, any>;
}

export class CreateLessonDto {
  @IsInt() classGroupId: number;
  @IsInt() courseId: number;
  @IsOptional() @IsInt() teacherId?: number;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
  @IsOptional() @IsInt() roomId?: number;
}

export class UpdateLessonDto {
  @IsOptional() @IsInt() teacherId?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsString() status?: string;
}

export class CoursePageQueryDto extends PageQueryDto {
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsIn(Object.values(CourseType)) type?: CourseType;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() keyword?: string;
}

/** 每周上课时段：weekday 1=周一 ... 7=周日 */
export class LessonSlotDto {
  @IsInt() weekday: number;
  @IsString() start: string; // HH:mm
  @IsString() end: string; // HH:mm
}

/**
 * 按周批量生成课次（文档 §4.1 课次编排 / §6.12 排课）。
 * 未传 slots 时取班级 scheduleJson：[{ weekday, start, end }]
 */
export class GenerateLessonsDto {
  @IsInt() classGroupId: number;
  @IsDateString() startDate: string; // YYYY-MM-DD
  @IsDateString() endDate: string; // YYYY-MM-DD
  @IsOptional() @IsInt() teacherId?: number;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @Type(() => LessonSlotDto) @ValidateNested({ each: true }) slots?: LessonSlotDto[];
}
