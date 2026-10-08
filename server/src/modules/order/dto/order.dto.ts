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
  @IsOptional() @IsIn(['COURSE', 'HOUR_PACK'] as const) itemType?: 'COURSE' | 'HOUR_PACK';
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
}

export class OrderPageQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(Object.values(OrderStatus)) status?: OrderStatus;
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() keyword?: string; // 订单号
}
