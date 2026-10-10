import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export const EMPLOYEE_KINDS = [
  'teacher',
  'academic',
  'consultant',
  'finance',
  'operation',
  'admin',
] as const;
export const EMPLOYEE_STATUS = ['ACTIVE', 'LEFT'] as const;

export class CreateEmployeeDto {
  @IsString() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(['M', 'F']) gender?: 'M' | 'F';
  @IsOptional() @IsEnum(EMPLOYEE_KINDS) kind?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) userId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(['M', 'F']) gender?: 'M' | 'F';
  @IsOptional() @IsEnum(EMPLOYEE_KINDS) kind?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsEnum(EMPLOYEE_STATUS) status?: string;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @IsDateString() leaveDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) userId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class EmployeePageQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(EMPLOYEE_KINDS) kind?: string;
  @IsOptional() @IsEnum(EMPLOYEE_STATUS) status?: string;
  @IsOptional() @IsString() keyword?: string;
}

export class UpsertTeacherProfileDto {
  @IsOptional() @IsArray() @IsString({ each: true }) subjects?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) ageGroups?: string[];
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) avatarResId?: number;
}

export class CreateCertificateDto {
  /** 由路径参数 /employees/:id/certificates 提供，不放在请求体 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number;
  @IsString() type!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expireAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fileResId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateCertificateDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() expireAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fileResId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class CertificatePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number;
}
