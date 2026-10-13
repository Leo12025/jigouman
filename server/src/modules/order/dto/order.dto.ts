import {
  IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsIn, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/dto/pagination.dto';
import { OrderStatus, PayType } from '../entities/order.entity';
import { PayChannel } from '../entities/payment.entity';
import { RefundStatus } from '../entities/refund.entity';

export class CreateOrderItemDto {
  @IsInt() @IsNotEmpty() courseId: number;
  @IsOptional() @IsIn(['COURSE', 'HOUR_PACK', 'DEPOSIT'] as const)
  itemType?: 'COURSE' | 'HOUR_PACK' | 'DEPOSIT';
  /** HOUR_PACK 时关联课包 */
  @IsOptional() @IsInt() packageId?: number;
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(1) qty: number;
  @IsNumber() @Min(0) unitPrice: number;
  /** 该项对应发放的课时数（支付成功后落到学员账户） */
  @IsInt() @Min(0) hours: number;
}

export class CreateOrderDto {
  @IsInt() @IsNotEmpty() studentId: number;
  @IsOptional() @IsInt() ownerId?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() couponCode?: string;
  /** 学员提交的优惠券码数组（与 couponCode 二选一，多券可叠加） */
  @IsOptional() @IsArray() @IsString({ each: true }) couponCodes?: string[];
  @IsOptional() @IsString() remark?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
}

export class PayOrderDto {
  @IsIn(['WECHAT', 'ALIPAY', 'OFFLINE', 'CARD', 'OTHER'] as const) channel: PayChannel;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() tradeNo?: string;
  @IsOptional() @IsIn(['WECHAT', 'ALIPAY', 'OFFLINE', 'CARD', 'OTHER'] as const) payType?: PayType;
}

export class RefundDto {
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() reason?: string;
  /** 审批人(兜底)：未配置审批流模板时作为单节点审批人，配置模板后优先走模板 */
  @IsOptional() @IsInt() approverId?: number;
}

/** 创建定金单（§2.4 #15）：如集训营预约定金 200 抵 800 */
export class CreateDepositOrderDto {
  @IsInt() @IsNotEmpty() studentId: number;
  /** 定金金额（实付，如 200） */
  @IsNumber() @Min(0) amount: number;
  /**
   * 转正式订单时可抵扣的金额（如 800）。
   * 不传时默认等于定金金额（付多少抵多少）。
   */
  @IsOptional() @IsNumber() @Min(0) deductAmount?: number;
  /** 预定标的（课程/课包），仅作快照便于后续转单 */
  @IsOptional() @IsInt() courseId?: number;
  @IsOptional() @IsInt() packageId?: number;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() ownerId?: number;
  @IsOptional() @IsString() remark?: string;
}

/** 定金转正式订单（抵扣后生成正式购课订单） */
export class ConvertDepositDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) couponCodes?: string[];
  @IsOptional() @IsInt() ownerId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class OrderPageQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(Object.values(OrderStatus)) status?: OrderStatus;
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() keyword?: string; // 订单号
}
