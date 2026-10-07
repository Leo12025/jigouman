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
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsInt() status?: number;
  @IsOptional() @IsArray() roleIds?: number[];
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() password: string;
}

export class CreateRoleDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() dataScope?: 'all' | 'org' | 'self';
  @IsOptional() @IsArray() permissionIds?: number[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() dataScope?: 'all' | 'org' | 'self';
  @IsOptional() @IsArray() permissionIds?: number[];
}
