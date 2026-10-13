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
import { StoredValueModule } from '../stored-value/stored-value.module';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import { PackageItem } from '../course-package/entities/package-item.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, OrderItem, Payment, Refund,
      // 支付发放需按套餐 consume_mode 路由、组合套餐按子项拆分
      CoursePackage, PackageItem,
      // 退费违约金比例按租户可配
      Tenant,
    ]),
    HourModule,
    CouponModule,
    ApprovalModule,
    StudentModule,
    // 储值支付：用学员储值余额抵扣订单
    StoredValueModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
