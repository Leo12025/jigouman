import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsInt, IsArray, ArrayMinSize,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateApprovalDto {
  @IsString() bizType: string;
  @IsOptional() @Type(() => Number) @IsInt() bizId?: number;
  @IsString() title: string;
  /** 直接指定审批人链（向后兼容）；与 flowId 二选一 */
  @IsOptional() @IsArray() @Type(() => Number) @IsInt({ each: true })
  approverIds?: number[];
  /** 引用审批流模板：自动套用其节点配置 */
  @IsOptional() @Type(() => Number) @IsInt() flowId?: number;
}

export class ApprovalPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() bizType?: string;
}

export class ApprovalActionDto {
  @IsOptional() @IsString() comment?: string;
}
