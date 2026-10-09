import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsBoolean, IsArray, IsInt, IsIn, ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 审批流节点（创建/更新入参） */
export class FlowNodeDto {
  @IsInt() order: number;
  @IsString() name: string;
  @IsIn(['USER', 'ROLE']) approverType: 'USER' | 'ROLE';
  @IsOptional() @Type(() => Number) @IsInt() approverId?: number;
  @IsOptional() @IsString() approverRole?: string;
}

export class CreateApprovalFlowDto {
  @IsString() bizType: string;
  @IsString() name: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => FlowNodeDto)
  nodes: FlowNodeDto[];
}

export class UpdateApprovalFlowDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FlowNodeDto)
  nodes?: FlowNodeDto[];
}

export class ApprovalFlowPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() bizType?: string;
  @IsOptional() @IsString() status?: string;
}
