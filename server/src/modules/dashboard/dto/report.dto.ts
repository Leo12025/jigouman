import { IsOptional, IsString, IsIn, IsArray, ArrayNotEmpty } from 'class-validator';

/** 自定义报表（§4.10 报表增强）：选择数据源 + 维度 + 指标，服务端聚合分组 */
export class CustomReportDto {
  @IsIn(['order', 'lead'])
  source: 'order' | 'lead';

  /** 分组维度（可多选，组合成复合键） */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  dimensions: string[];

  /** 聚合指标（可多选） */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  metrics: string[];

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

export const REPORT_DIMENSIONS = {
  order: ['status', 'month'],
  lead: ['channel', 'campaign', 'stage'],
} as const;

export const REPORT_METRICS = {
  order: ['orderCount', 'receivable', 'received', 'refundAmount', 'studentCount'],
  lead: ['leadCount', 'trial', 'signed'],
} as const;

/** 自定义报表导出（Excel=CSV带BOM / PDF=极简文本表），复用自定义报表聚合结果 */
export class ExportReportDto extends CustomReportDto {
  @IsIn(['excel', 'pdf'])
  format: 'excel' | 'pdf';

  @IsOptional()
  @IsString()
  title?: string;
}
