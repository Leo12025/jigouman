import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { StudentStatus } from '../entities/student.entity';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateStudentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsInt() gender?: number;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsIn(Object.values(StudentStatus)) status?: StudentStatus;
  @IsOptional() tags?: string[];
}

export class UpdateStudentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() gender?: number;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() school?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsIn(Object.values(StudentStatus)) status?: StudentStatus;
  @IsOptional() tags?: string[];
}

export class BindParentDto {
  @IsInt() studentId: number;
  @IsString() @IsNotEmpty() parentName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsString() relation?: string;
  @IsOptional() @IsBoolean() isMain?: boolean;
  @IsOptional() @IsString() bindSource?: string;
}

export class UnbindParentDto {
  @IsInt() studentId: number;
  @IsInt() parentId: number;
}

export class EnrollCourseDto {
  @IsInt() studentId: number;
  @IsInt() courseId: number;
  @IsOptional() @IsInt() classGroupId?: number;
}

export class StudentPageQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(Object.values(StudentStatus)) status?: StudentStatus;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsInt() classGroupId?: number;
}
