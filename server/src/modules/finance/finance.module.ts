import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplitConfig } from './entities/split-config.entity';
import { SplitRecord } from './entities/split-record.entity';
import { Salary } from './entities/salary.entity';
import { Invoice } from './entities/invoice.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { HourConsumption } from '../hour/entities/hour-consumption.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SplitConfig, SplitRecord, Salary, Invoice,
      HourAccount, HourConsumption,
    ]),
  ],
  providers: [FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
