import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Score } from './entities/score.entity';
import { GrowthMetric } from './entities/growth-metric.entity';
import { Contest } from './entities/contest.entity';
import { ContestJoin } from './entities/contest-join.entity';
import { Award } from './entities/award.entity';
import { GrowthService } from './growth.service';
import { GrowthController, StudentGrowthController } from './growth.controller';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, Score, GrowthMetric, Contest, ContestJoin, Award]),
    TaskModule,
  ],
  providers: [GrowthService],
  controllers: [GrowthController, StudentGrowthController],
  exports: [GrowthService],
})
export class GrowthModule {}
