import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HourAccount } from './entities/hour-account.entity';
import { HourConsumption } from './entities/hour-consumption.entity';
import { Attendance } from './entities/attendance.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { HourService } from './hour.service';
import { HourController } from './hour.controller';
import { FinanceModule } from '../finance/finance.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HourAccount, HourConsumption, Attendance, Lesson]),
    FinanceModule,
    TaskModule,
  ],
  providers: [HourService],
  controllers: [HourController],
  exports: [HourService],
})
export class HourModule {}
