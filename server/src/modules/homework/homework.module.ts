import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Homework } from './entities/homework.entity';
import { HomeworkSubmit } from './entities/homework-submit.entity';
import { HomeworkReview } from './entities/homework-review.entity';
import { StudentParent } from '../student/entities/student-parent.entity';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Student } from '../student/entities/student.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Homework, HomeworkSubmit, HomeworkReview,
      StudentParent, StudentCourse, Student, Lesson,
    ]),
  ],
  providers: [HomeworkService],
  controllers: [HomeworkController],
  exports: [HomeworkService],
})
export class HomeworkModule {}
