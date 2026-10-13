import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class PreviewUpgradeDto {
  @Type(() => Number) @IsInt() @IsNotEmpty() studentId: number;
  /** 被升级的原课时账户 */
  @Type(() => Number) @IsInt() @IsNotEmpty() fromAccountId: number;
  @Type(() => Number) @IsInt() @IsNotEmpty() toPackageId: number;
  /** 目标阶梯档位（可选） */
  @IsOptional() @Type(() => Number) @IsInt() toTierId?: number;
  /**
   * 赠课是否参与折价（默认取租户配置 upgradeIncludeGiftHours，缺省为 false）。
   * false=与退费口径一致，赠课不退不折现。
   */
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeGift?: boolean;
}

export class CreateUpgradeDto extends PreviewUpgradeDto {
  @IsOptional() @IsString() remark?: string;
  /** 审批人(兜底)：未配置审批流模板时作为单节点审批人 */
  @IsOptional() @Type(() => Number) @IsInt() approverId?: number;
}

export class PackageUpgradePageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() studentId?: number;
  @IsOptional() @IsString() status?: string;
}
