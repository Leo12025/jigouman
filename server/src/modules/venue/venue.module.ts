import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom } from './entities/classroom.entity';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Classroom])],
  providers: [VenueService],
  controllers: [VenueController],
  exports: [VenueService],
})
export class VenueModule {}
