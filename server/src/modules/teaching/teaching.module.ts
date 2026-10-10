import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineClass } from './entities/online-class.entity';
import { StudyRecord } from './entities/study-record.entity';
import { TeachingService } from './teaching.service';
import { TeachingController } from './teaching.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OnlineClass, StudyRecord])],
  providers: [TeachingService],
  controllers: [TeachingController],
  exports: [TeachingService],
})
export class TeachingModule {}
