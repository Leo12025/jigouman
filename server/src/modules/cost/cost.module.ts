import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostRecord } from './entities/cost-record.entity';
import { CostService } from './cost.service';
import { CostController } from './cost.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CostRecord])],
  providers: [CostService],
  controllers: [CostController],
  exports: [CostService],
})
export class CostModule {}
