import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { HourModule } from '../../modules/hour/hour.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Refund]),
    HourModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
