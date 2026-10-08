import { Type } from 'class-transformer';
import {
  IsOptional, IsString, IsInt, Length, Matches,
} from 'class-validator';

/** 发送/校验短信验证码 */
export class SendOtpDto {
  @IsString() @Length(11, 11) @Matches(/^1\d{10}$/, { message: '手机号格式不正确' }) phone: string;
}

export class ParentLoginDto {
  @IsString() @Length(11, 11) @Matches(/^1\d{10}$/) phone: string;
  @IsString() @Length(6, 6) code: string;
  @IsOptional() @Type(() => Number) @IsInt() tenantId?: number;
}

/** 绑定学员（§6.23：OTP 确认 / 顾问邀请码） */
export class BindStudentDto {
  @Type(() => Number) @IsInt() studentId: number;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() relation?: string;
}
