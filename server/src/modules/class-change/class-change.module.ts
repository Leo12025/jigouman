import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassTransfer } from './entities/class-transfer.entity';
import { LessonReschedule } from './entities/lesson-reschedule.entity';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { ClassGroup } from '../course/entities/class-group.entity';
import { ClassChangeService } from './class-change.service';
import { ClassChangeController } from './class-change.controller';
import { ApprovalModule } from '../approval/approval.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassTransfer, LessonReschedule, StudentCourse, Lesson, ClassGroup]),
    ApprovalModule,
    OrderModule,
  ],
  providers: [ClassChangeService],
  controllers: [ClassChangeController],
  exports: [ClassChangeService],
})
export class ClassChangeModule {}
