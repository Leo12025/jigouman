import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseStage } from './entities/course-stage.entity';
import { Courseware } from './entities/courseware.entity';
import { CoursewareService } from './courseware.service';
import { CoursewareController } from './courseware.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourseStage, Courseware])],
  providers: [CoursewareService],
  controllers: [CoursewareController],
  exports: [CoursewareService],
})
export class CoursewareModule {}
