import { IsOptional, IsInt, Min } from 'class-validator';

/** 看板角色：经营(校长) / 招生(顾问) / 教学(教务)（文档 §4.10 / §6.7） */
export type DashboardRole = 'principal' | 'admission' | 'teaching';

export const DASHBOARD_ROLES: DashboardRole[] = ['principal', 'admission', 'teaching'];

/** 看板查询：可选时间窗与趋势月份数（§6.7 GET /api/v1/dashboards/{role}） */
export class DashboardQueryDto {
  @IsOptional()
  start?: string;

  @IsOptional()
  end?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  months?: number;
}
