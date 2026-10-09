import { Type } from 'class-transformer';
import { IsOptional, IsInt } from 'class-validator';

export class NotifyPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() page = 1;
  @IsOptional() @Type(() => Number) @IsInt() size = 20;
  /** 仅未读（=1） */
  @IsOptional() @Type(() => Number) @IsInt() unreadOnly?: number;
}
