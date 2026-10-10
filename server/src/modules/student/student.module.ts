import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentParent } from './entities/student-parent.entity';
import { StudentCourse } from './entities/student-course.entity';
import { StudentService } from './student.service';
import { StudentLifecycleService } from './student-lifecycle.service';
import { StudentController } from './student.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student, StudentParent, StudentCourse])],
  providers: [StudentService, StudentLifecycleService],
  controllers: [StudentController],
  exports: [StudentService, StudentLifecycleService],
})
export class StudentModule {}
