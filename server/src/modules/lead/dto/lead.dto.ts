import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/dto/pagination.dto';
import { ChannelType } from '../entities/channel.entity';
import { CampaignType } from '../entities/campaign.entity';
import { LeadStage } from '../entities/lead.entity';
import { FollowType } from '../entities/lead-follow.entity';

// ---------- 渠道 ----------
export class CreateChannelDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsIn(Object.values(ChannelType)) type?: ChannelType;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsInt() status?: number;
}
export class UpdateChannelDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(Object.values(ChannelType)) type?: ChannelType;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsInt() status?: number;
}

// ---------- 活动 ----------
export class CreateCampaignDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsIn(Object.values(CampaignType)) type?: CampaignType;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsInt() status?: number;
}
export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(Object.values(CampaignType)) type?: CampaignType;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsInt() status?: number;
}

// ---------- 线索 ----------
export class CreateLeadDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsOptional() @IsInt() channelId?: number;
  @IsOptional() @IsInt() campaignId?: number;
  @IsOptional() @IsInt() ownerId?: number;
  @IsOptional() @IsInt() gender?: number;
  @IsOptional() @IsInt() age?: number;
  @IsOptional() @IsString() intentionCourse?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() remark?: string;
}
export class UpdateLeadDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsInt() channelId?: number;
  @IsOptional() @IsInt() campaignId?: number;
  @IsOptional() @IsInt() ownerId?: number;
  @IsOptional() @IsIn(Object.values(LeadStage)) stage?: LeadStage;
  @IsOptional() @IsInt() gender?: number;
  @IsOptional() @IsInt() age?: number;
  @IsOptional() @IsString() intentionCourse?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() remark?: string;
}
export class LeadPageQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(Object.values(LeadStage)) stage?: LeadStage;
  @IsOptional() @IsInt() @Type(() => Number) ownerId?: number;
  @IsOptional() @IsInt() @Type(() => Number) channelId?: number;
  @IsOptional() @IsInt() @Type(() => Number) campaignId?: number;
  @IsOptional() @IsString() keyword?: string;
}

// ---------- 线索动作 ----------
export class AssignLeadDto {
  @IsInt() ownerId: number;
}
export class FollowLeadDto {
  @IsIn(Object.values(FollowType)) type: FollowType;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsDateString() nextFollowAt?: string;
}
export class ConvertLeadDto {
  @IsOptional() @IsString() studentName?: string;
  @IsOptional() @IsInt() gender?: number;
}
export class TrialLessonDto {
  @IsOptional() @IsInt() lessonId?: number;
  @IsOptional() @IsDateString() trialAt?: string;
  @IsOptional() @IsBoolean() attended?: boolean;
  @IsOptional() @IsString() feedback?: string;
}

// ---------- 漏斗 ----------
export class FunnelQueryDto {
  @IsOptional() @IsInt() @Type(() => Number) channelId?: number;
  @IsOptional() @IsInt() @Type(() => Number) campaignId?: number;
  @IsOptional() @IsDateString() start?: string;
  @IsOptional() @IsDateString() end?: string;
}
