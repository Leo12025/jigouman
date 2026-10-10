import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { HourModule } from '../../modules/hour/hour.module';
import { CouponModule } from '../../modules/coupon/coupon.module';
import { ApprovalModule } from '../../modules/approval/approval.module';
import { StudentModule } from '../../modules/student/student.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Refund]),
    HourModule,
    CouponModule,
    ApprovalModule,
    StudentModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
