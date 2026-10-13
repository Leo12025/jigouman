import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePackage } from './entities/course-package.entity';
import { PackageCourse } from './entities/package-course.entity';
import { PackageItem } from './entities/package-item.entity';
import { PackageTier } from './entities/package-tier.entity';
import { PackagePriceRule } from './entities/package-price-rule.entity';
import { Course } from '../course/entities/course.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Order } from '../order/entities/order.entity';
import { CoursePackageService } from './course-package.service';
import { CoursePackageController } from './course-package.controller';
import { HourModule } from '../hour/hour.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoursePackage, PackageCourse, PackageItem, PackageTier, PackagePriceRule, Course,
      // 合规阈值按租户可配（tenants.config.compliance）
      Tenant,
      // 老生判定：存在有效订单即为老生（§2.4 #17 续费专享包）
      Order,
    ]),
    HourModule,
  ],
  providers: [CoursePackageService],
  controllers: [CoursePackageController],
  exports: [CoursePackageService],
})
export class CoursePackageModule {}
