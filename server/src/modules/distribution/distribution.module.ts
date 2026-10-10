import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distributor } from './entities/distributor.entity';
import { Commission } from './entities/commission.entity';
import { DistributionService } from './distribution.service';
import { DistributionController } from './distribution.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Distributor, Commission])],
  providers: [DistributionService],
  controllers: [DistributionController],
  exports: [DistributionService],
})
export class DistributionModule {}
