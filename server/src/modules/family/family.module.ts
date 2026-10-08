import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseReview } from './entities/course-review.entity';
import { TaskModule } from '../task/task.module';
import { FamilyService } from './family.service';
import { FamilyController, StudentReviewController } from './family.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourseReview]), TaskModule],
  providers: [FamilyService],
  controllers: [FamilyController, StudentReviewController],
  exports: [FamilyService],
})
export class FamilyModule {}
