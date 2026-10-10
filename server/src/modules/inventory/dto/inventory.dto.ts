import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateMaterialDto {
  @IsOptional() @IsString() sku?: string;
  @IsString() name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) warningQty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateMaterialDto {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) warningQty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) orgId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class StockAdjustDto {
  /** IN 入库 / OUT 出库 */
  @IsEnum(['IN', 'OUT']) type!: 'IN' | 'OUT';
  @Type(() => Number) @IsInt() @Min(1) qty!: number;
  @IsOptional() @IsString() remark?: string;
}

export class InventoryPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() keyword?: string;
}
