import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateDistributorDto {
  @IsString() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) level?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateDistributorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) level?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class RecordCommissionDto {
  @Type(() => Number) @IsInt() @Min(1) distributorId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orderId?: number;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() remark?: string;
}

export class SettleCommissionDto {
  @IsEnum(['PENDING', 'SETTLED', 'CANCELLED']) status!: 'PENDING' | 'SETTLED' | 'CANCELLED';
}

export class DistributorPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parentId?: number;
}
