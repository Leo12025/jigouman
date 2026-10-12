import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HourAccount } from './entities/hour-account.entity';
import { HourConsumption } from './entities/hour-consumption.entity';
import { Attendance } from './entities/attendance.entity';
import { Entitlement } from './entities/entitlement.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { CoursePackage } from '../course-package/entities/course-package.entity';
import { PackageCourse } from '../course-package/entities/package-course.entity';
import { PackageItem } from '../course-package/entities/package-item.entity';
import { HourService } from './hour.service';
import { HourController } from './hour.controller';
import { FinanceModule } from '../finance/finance.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HourAccount, HourConsumption, Attendance, Entitlement, Enrollment, Lesson,
      // 消课账户选择需按课程反查课包范围（package_course / package_item / 通用包）
      CoursePackage, PackageCourse, PackageItem,
    ]),
    FinanceModule,
    TaskModule,
  ],
  providers: [HourService],
  controllers: [HourController],
  exports: [HourService],
})
export class HourModule {}
