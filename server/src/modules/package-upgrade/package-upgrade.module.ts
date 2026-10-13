import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageUpgrade } from './entities/package-upgrade.entity';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import { PackageTier } from '../course-package/entities/package-tier.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Order } from '../order/entities/order.entity';
import { PackageUpgradeService } from './package-upgrade.service';
import { PackageUpgradeController } from './package-upgrade.controller';
import { HourModule } from '../hour/hour.module';
import { CoursePackageModule } from '../course-package/course-package.module';
import { OrderModule } from '../order/order.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PackageUpgrade, CoursePackage, PackageTier, HourAccount, Tenant, Order,
    ]),
    HourModule,
    CoursePackageModule,
    OrderModule,
    ApprovalModule,
  ],
  providers: [PackageUpgradeService],
  controllers: [PackageUpgradeController],
  exports: [PackageUpgradeService],
})
export class PackageUpgradeModule {}
