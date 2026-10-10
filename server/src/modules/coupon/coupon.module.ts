import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponTemplate } from './entities/coupon-template.entity';
import { CouponGrant } from './entities/coupon-grant.entity';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CouponTemplate, CouponGrant])],
  providers: [CouponService],
  controllers: [CouponController],
  exports: [CouponService],
})
export class CouponModule {}
