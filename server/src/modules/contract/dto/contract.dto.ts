import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

export class CreateContractTemplateDto {
  @IsString() name!: string;
  @IsOptional() @IsString() type?: string;
  @IsString() content!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdateContractTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() remark?: string;
}

export class CreateContractDto {
  @Type(() => Number) @IsInt() @Min(1) templateId!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsString() partyName!: string;
  @IsOptional() @IsString() idCard?: string;
  @IsOptional() @IsString() relatedType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) relatedId?: number;
  @IsOptional() @IsString() remark?: string;
}

export class SignContractDto {
  @IsOptional() @IsString() partyName?: string;
  @IsOptional() @IsString() idCard?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) signatureResId?: number;
}

export class ContractPageQueryDto extends PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() relatedType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) relatedId?: number;
}
