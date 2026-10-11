import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  config?: string;

  /** 有效期截止（ISO 字符串，空=永久） */
  @IsOptional()
  @IsString()
  expiresAt?: string;

  /** 校区额度（最大校区数，空=不限） */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxCampuses?: number;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';

  @IsOptional()
  @IsString()
  config?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxCampuses?: number;
}

export class TenantQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
