import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 储值充值（含预存赠送，如充 5000 送 500） */
export class RechargeDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  /** 充值本金（受 5000 元预收费监管上限约束，超出需二次确认） */
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  /** 赠送金额（充 5000 送 500 时填 500；赠送不提现、退费不退） */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) giftAmount?: number;
  @IsOptional() @IsString() expireAt?: string;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @Type(() => Number) @IsInt() refOrderId?: number;
  /** 合规二次确认 */
  @IsOptional() @Type(() => Boolean) @IsBoolean() confirmCompliance?: boolean;
  /** 兜底审批人（未配置审批流模板时使用） */
  @IsOptional() @Type(() => Number) @IsInt() approverId?: number;
}

/** 储值消费（订单支付等） */
export class ConsumeDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @Type(() => Number) @IsInt() refOrderId?: number;
  @IsOptional() @IsString() remark?: string;
}

/** 退费退回储值（仅退本金，赠送部分不退） */
export class RefundToStoredValueDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @Type(() => Number) @IsInt() refOrderId?: number;
  @IsOptional() @IsString() remark?: string;
  /** 兜底审批人（未配置审批流模板时使用） */
  @IsOptional() @Type(() => Number) @IsInt() approverId?: number;
}

export class StoredValueAccountPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() status?: string;
}

export class StoredValueLedgerPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() accountId?: number;
  @IsOptional() @IsString() type?: string;
}
