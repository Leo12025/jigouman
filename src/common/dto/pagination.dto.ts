import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/** 分页查询基类（文档 §6 约定: ?page=1&size=20） */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  size = 20;

  /** 排序字段，如 createdAt */
  @IsOptional()
  sortBy?: string;

  /** asc | desc */
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
