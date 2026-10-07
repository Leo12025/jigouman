import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { Course } from './entities/course.entity';
import { ClassGroup } from './entities/class-group.entity';
import { Lesson } from './entities/lesson.entity';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseCategory, Course, ClassGroup, Lesson]),
  ],
  providers: [CourseService],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CourseModule {}
