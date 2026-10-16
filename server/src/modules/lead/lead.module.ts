import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './entities/channel.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignTemplate } from './entities/campaign-template.entity';
import { Lead } from './entities/lead.entity';
import { LeadFollow } from './entities/lead-follow.entity';
import { TrialLesson } from './entities/trial.entity';
import { LeadService } from './lead.service';
import {
  ChannelController,
  CampaignController,
  CampaignTemplateController,
  LeadController,
} from './lead.controller';
import { StudentModule } from '../student/student.module';
import { AiModule } from '../../common/ai/ai.module';

/**
 * M3 招生 + 线索模块（文档 §4.2/§4.3）。
 * 依赖 StudentModule 以在转化时联动创建学员与家长绑定；AiModule 提供 AI 评分辅助。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, Campaign, CampaignTemplate, Lead, LeadFollow, TrialLesson]),
    StudentModule,
    AiModule,
  ],
  providers: [LeadService],
  controllers: [ChannelController, CampaignController, CampaignTemplateController, LeadController],
  exports: [LeadService],
})
export class LeadModule {}
