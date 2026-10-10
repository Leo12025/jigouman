import { IsInt, IsIn, IsOptional, IsString } from 'class-validator';

export class ClockDto {
  @IsInt()
  teacherId: number;

  @IsIn(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @IsOptional()
  @IsInt()
  lessonId?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
