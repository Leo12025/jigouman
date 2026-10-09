import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePackage } from './entities/course-package.entity';
import { PackageCourse } from './entities/package-course.entity';
import { Course } from '../course/entities/course.entity';
import { CoursePackageService } from './course-package.service';
import { CoursePackageController } from './course-package.controller';
import { HourModule } from '../hour/hour.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoursePackage, PackageCourse, Course]),
    HourModule,
  ],
  providers: [CoursePackageService],
  controllers: [CoursePackageController],
  exports: [CoursePackageService],
})
export class CoursePackageModule {}
