import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Lead } from '../lead/entities/lead.entity';
import { Channel } from '../lead/entities/channel.entity';
import { Campaign } from '../lead/entities/campaign.entity';
import { Student } from '../student/entities/student.entity';
import { StudentCourse } from '../student/entities/student-course.entity';
import { Order } from '../order/entities/order.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { HourConsumption } from '../hour/entities/hour-consumption.entity';
import { Attendance } from '../hour/entities/attendance.entity';
import { ClassGroup } from '../course/entities/class-group.entity';
import { Homework } from '../homework/entities/homework.entity';
import { HomeworkSubmit } from '../homework/entities/homework-submit.entity';
import { HomeworkReview } from '../homework/entities/homework-review.entity';
import { Task } from '../task/entities/task.entity';
import { CourseReview } from '../family/entities/course-review.entity';
import { MetricDef } from './entities/metric-def.entity';
import { Organization } from '../org/entities/organization.entity';
import { CostRecord } from '../cost/entities/cost-record.entity';
import { Material } from '../inventory/entities/material.entity';
import { AiModule } from '../../common/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Channel,
      Campaign,
      Student,
      StudentCourse,
      Order,
      HourAccount,
      HourConsumption,
      Attendance,
      ClassGroup,
      Homework,
      HomeworkSubmit,
      HomeworkReview,
      Task,
      CourseReview,
      MetricDef,
      Organization,
      CostRecord,
      Material,
    ]),
    AiModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
