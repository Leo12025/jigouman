import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateSurveyTemplateDto {
  @IsString() title!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() questions?: any[];
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateSurveyTemplateDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() questions?: any[];
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class SubmitSurveyDto {
  @Type(() => Number) @IsInt() @Min(1) templateId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  /** NPS 0-10 */
  @IsOptional() @Type(() => Number) @IsInt() score?: number;
  @IsOptional() @IsArray() answers?: any[];
}

export class SurveyPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) templateId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @IsString() status?: string;
}
