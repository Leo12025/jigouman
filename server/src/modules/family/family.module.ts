import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseReview } from './entities/course-review.entity';
import { Notice } from './entities/notice.entity';
import { RenewalReminder } from './entities/renewal-reminder.entity';
import { TaskModule } from '../task/task.module';
import { FamilyService } from './family.service';
import {
  FamilyController, StudentReviewController, NoticeController, RenewalController,
} from './family.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CourseReview, Notice, RenewalReminder]), TaskModule],
  providers: [FamilyService],
  controllers: [FamilyController, StudentReviewController, NoticeController, RenewalController],
  exports: [FamilyService],
})
export class FamilyModule {}
