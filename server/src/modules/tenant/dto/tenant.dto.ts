import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject, ValidateNested, Matches } from 'class-validator';
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

/** 品牌资料（机构自助可改）：Logo、联系方式、地址 */
export class TenantBrandDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

/** 主题：主色（#RRGGBB / #RRGGBBAA） */
export class TenantThemeDto {
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, { message: '主题色须为 #RRGGBB 或 #RRGGBBAA' })
  primaryColor?: string;
}

/** 租户级结构化配置（原 config 自由文本的结构化形态） */
export class TenantConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantBrandDto)
  brand?: TenantBrandDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantThemeDto)
  theme?: TenantThemeDto;

  @IsOptional()
  @IsIn(['zh-CN', 'en-US'])
  language?: 'zh-CN' | 'en-US';

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;
}

/**
 * 租户自助更新（仅 name 与结构化 config）。
 * slug/域名/校区额度/有效期/状态仍由平台在「租户中心」管控，不在此暴露。
 */
export class UpdateTenantSelfDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantConfigDto)
  config?: TenantConfigDto;
}
