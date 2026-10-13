import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 合规二次确认：课时/金额超预收费监管上限时弹窗，确认后继续 */
export class ComplianceConfirmDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() confirmCompliance?: boolean;
}

export class CreateGroupBuyActivityDto extends ComplianceConfirmDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) courseId?: number;
  /** 关联课包：成团后按课包 consume_mode 发放（BY_HOUR/BY_TIME/BY_PERIOD） */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) packageId?: number;
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  /** 成团后为每位成员发放的课时数 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) hours?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) groupSize?: number;
  /** 团长优惠价：提高开团意愿 */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) leaderPrice?: number;
  /** 团有效期(小时)：开团后须在此时间内邀满，过期失效 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamValidHours?: number;
  /** 模拟成团：到期未成团时系统自动补足 */
  @IsOptional() @Type(() => Boolean) @IsBoolean() autoFill?: boolean;
  /** 新老客限制：NEW_ONLY 时老学员（有有效订单）不可参团 */
  @IsOptional() @IsIn(['ALL', 'NEW_ONLY'] as const) joinRule?: 'ALL' | 'NEW_ONLY';
  /** 一级佣金比例(0~1)，如 0.15 = 15% */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) commissionRate1?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) commissionRate2?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  /** 活动负责人：未成团退款的兜底审批人 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) ownerId?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateGroupBuyActivityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) courseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) packageId?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) hours?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) groupSize?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) leaderPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamValidHours?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() autoFill?: boolean;
  @IsOptional() @IsIn(['ALL', 'NEW_ONLY'] as const) joinRule?: 'ALL' | 'NEW_ONLY';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) commissionRate1?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) commissionRate2?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) ownerId?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

/** 阶梯档位：人数越多价越低，建议 3~5 档 */
export class GroupBuyTierDto {
  @Type(() => Number) @IsInt() @Min(2) minSize!: number;
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() sort?: number;
}

export class SetGroupBuyTiersDto {
  @ValidateNested() tiers!: GroupBuyTierDto[];
}

export class CreateTeamDto extends ComplianceConfirmDto {
  @Type(() => Number) @IsInt() @Min(1) activityId!: number;
  @Type(() => Number) @IsInt() @Min(1) leaderStudentId!: number;
  /** 来源分销员：成团后按活动佣金比例入账 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) distributorId?: number;
  /** 归属员工(顾问)：用于员工榜与战队 PK */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) staffId?: number;
}

export class JoinTeamDto extends ComplianceConfirmDto {
  @IsString() code!: string;
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) distributorId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) staffId?: number;
  /** 匿名访客标识：便于过程数据统计 */
  @IsOptional() @IsString() visitorId?: string;
}

export class RedeemDto {
  @IsString() code!: string;
}

/** 晒单（买家秀） */
export class CreateShowoffDto {
  @Type(() => Number) @IsInt() @Min(1) teamId!: number;
  @Type(() => Number) @IsInt() @Min(1) studentId!: number;
  @IsOptional() @IsString() images?: string;
  @IsOptional() @IsString() content?: string;
}

/** 战队 */
export class CreateSquadDto {
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) activityId?: number;
  @IsOptional() @IsString() staffIds?: string;
}

/** 活动过程埋点上报 */
export class TrackEventDto {
  @Type(() => Number) @IsInt() @Min(1) activityId!: number;
  @IsIn(['VIEW', 'SHARE', 'JOIN', 'TEAM_OPEN', 'TEAM_SUCCESS', 'REDEEM'] as const)
  type!: 'VIEW' | 'SHARE' | 'JOIN' | 'TEAM_OPEN' | 'TEAM_SUCCESS' | 'REDEEM';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @IsString() visitorId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) staffId?: number;
}

/** 营销物料 */
export class CreateMaterialDto {
  @IsString() name!: string;
  @IsOptional() @IsIn(['POSTER', 'FLYER', 'ARTICLE', 'INVITE'] as const)
  type?: 'POSTER' | 'FLYER' | 'ARTICLE' | 'INVITE';
  @IsOptional() @IsString() scene?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) activityId?: number;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() printable?: boolean;
}

export class GroupBuyPageQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) activityId?: number;
}
