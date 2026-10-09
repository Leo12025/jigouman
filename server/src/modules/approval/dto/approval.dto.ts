import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsInt, IsArray, ArrayMinSize,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateApprovalDto {
  @IsString() bizType: string;
  @IsOptional() @Type(() => Number) @IsInt() bizId?: number;
  @IsString() title: string;
  @IsArray() @ArrayMinSize(1) @Type(() => Number) @IsInt({ each: true })
  approverIds: number[];
}

export class ApprovalPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() bizType?: string;
}

export class ApprovalActionDto {
  @IsOptional() @IsString() comment?: string;
}
