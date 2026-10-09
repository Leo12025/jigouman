import { IsString, IsOptional, IsInt, IsIn, MaxLength } from 'class-validator';

export class CreateComplaintDto {
  @IsOptional() @IsInt() studentId?: number;
  @IsOptional() @IsInt() courseId?: number;

  @IsString() @MaxLength(160) title: string;

  @IsString() content: string;

  @IsOptional() @IsIn(['PHONE', 'WECHAT', 'WALKIN', 'OTHER']) channel?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) level?: string;

  /** 建单即分派的处理人；不传则停留在 PENDING 待分派 */
  @IsOptional() @IsInt() assigneeId?: number;
}

export class AssignComplaintDto {
  @IsInt() assigneeId: number;
}

export class ResolveComplaintDto {
  @IsString() resolution: string;
}

export class ComplaintPageQueryDto {
  @IsOptional() @IsIn(['PENDING', 'PROCESSING', 'RESOLVED', 'CLOSED']) status?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) level?: string;
  @IsOptional() @IsInt() assigneeId?: number;
  @IsOptional() @IsInt() page?: number;
  @IsOptional() @IsInt() size?: number;
}
