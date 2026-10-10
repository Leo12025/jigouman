import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateGroupBuyActivityDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) courseId?: number;
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) groupSize?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateGroupBuyActivityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) groupSize?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class CreateTeamDto {
  @Type(() => Number) @IsInt() @Min(1) activityId!: number;
  @Type(() => Number) @IsInt() @Min(1) leaderStudentId!: number;
}

export class JoinTeamDto {
  @IsString() code!: string;
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
}

export class GroupBuyPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) activityId?: number;
}
