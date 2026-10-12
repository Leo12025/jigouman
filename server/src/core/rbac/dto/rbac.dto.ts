import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsInt() status?: number;
  /** 角色 ID 列表 */
  @IsOptional() @IsArray() roleIds?: number[];
  /** 归属校区 id 列表（空/不传=租户内全部校区可见） */
  @IsOptional() @IsArray() @IsInt({ each: true }) orgIds?: number[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsArray() roleIds?: number[];
  /** 归属校区 id 列表（空/不传=租户内全部校区可见） */
  @IsOptional() @IsArray() @IsInt({ each: true }) orgIds?: number[];
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() password: string;
}

export class CreateRoleDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() dataScope?: 'all' | 'org' | 'org_and_below' | 'self';
  @IsOptional() @IsArray() permissionIds?: number[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() dataScope?: 'all' | 'org' | 'org_and_below' | 'self';
  @IsOptional() @IsArray() permissionIds?: number[];
}
