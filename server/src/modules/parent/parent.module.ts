import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../core/auth/auth.module';
import { Parent } from './entities/parent.entity';
import { StudentParent } from '../student/entities/student-parent.entity';
import { Student } from '../student/entities/student.entity';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { Homework } from '../homework/entities/homework.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';
import { CourseReview } from '../family/entities/course-review.entity';
import { ParentService } from './parent.service';
import { ParentController } from './parent.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Parent, StudentParent, Student, StudentCourse,
      Lesson, Homework, HomeworkSubmit, CourseReview,
    ]),
  ],
  providers: [ParentService],
  controllers: [ParentController],
  exports: [ParentService],
})
export class ParentModule {}
