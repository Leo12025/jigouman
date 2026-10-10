import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyTemplate } from './entities/survey-template.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyTemplate, SurveyResponse])],
  providers: [SurveyService],
  controllers: [SurveyController],
  exports: [SurveyService],
})
export class SurveyModule {}
