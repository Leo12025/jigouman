import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsInt, IsDateString, Min, IsIn,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateTaskDto {
  @IsString() type: string;
  @IsString() title: string;
  @Type(() => Number) @IsInt() assigneeId: number;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @Type(() => Number) @IsInt() refId?: number;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class TaskPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() assigneeId?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @Type(() => Number) @IsInt() refId?: number;
}
