import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCoursePackageDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0) totalHours: number;
  @IsOptional() @IsInt() @Min(0) validDays?: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateCoursePackageDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) totalHours?: number;
  @IsOptional() @IsInt() @Min(0) validDays?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() remark?: string;
}

export class AddPackageCoursesDto {
  @IsArray() @IsInt({ each: true }) @IsNotEmpty({ each: true }) courseIds: number[];
}

export class PurchasePackageDto {
  @IsInt() @IsNotEmpty() studentId: number;
  /** 发放课时，默认取套餐 totalHours */
  @IsOptional() @IsInt() @Min(1) hours?: number;
  @IsOptional() @IsInt() orderId?: number;
}

export class CoursePackagePageQueryDto extends PageQueryDto {
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsString() keyword?: string;
}
