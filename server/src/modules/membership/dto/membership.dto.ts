import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateMemberLevelDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) level?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPoints?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @IsString() perks?: string;
  @IsOptional() @IsString() status?: string;
}

export class UpdateMemberLevelDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) level?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPoints?: number;
  @IsOptional() @Type(() => Number) @IsNumber() discount?: number;
  @IsOptional() @IsString() perks?: string;
  @IsOptional() @IsString() status?: string;
}

export class AdjustPointsDto {
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
  /** 正数发放 / 负数扣减 */
  @Type(() => Number) @IsInt() points!: number;
  @IsOptional() @IsEnum(['EARN', 'REDEEM', 'EXPIRE']) type?: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) refId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class MemberPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @IsString() status?: string;
}
