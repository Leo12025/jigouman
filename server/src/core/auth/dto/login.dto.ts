import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  /** 可选：指定租户（超级管理员跨租户登录用） */
  @IsOptional()
  tenantId?: number;
}

/** 刷新令牌（文档 §9.2：JWT 短时效 + 刷新令牌） */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
