import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateMetricDefDto {
  @IsString()
  @MaxLength(64)
  code: string;

  @IsString()
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsIn(['principal', 'admission', 'teaching', 'common'])
  category?: 'principal' | 'admission' | 'teaching' | 'common';

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UpdateMetricDefDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsIn(['principal', 'admission', 'teaching', 'common'])
  category?: 'principal' | 'admission' | 'teaching' | 'common';

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
