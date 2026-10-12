/**
 * 租户级「功能开关」可配置的模块清单。
 * 每个 feature 对应侧边栏某个菜单项（menuKey）；当该 feature 在租户 config.features 中显式为 false 时，
 * 对应菜单对全机构用户隐藏。默认（未配置）视为开启。
 */
export interface TenantFeature {
  /** config.features 中的键 */
  key: string;
  /** 设置页展示的中文名 */
  label: string;
  /** 对应侧边栏菜单的 key（路由路径） */
  menuKey: string;
}

export const TENANT_FEATURES: TenantFeature[] = [
  { key: 'bigScreen', label: '数据大屏', menuKey: '/big-screen' },
  { key: 'groupBuy', label: '团购拼团', menuKey: '/group-buy' },
  { key: 'distribution', label: '分销裂变', menuKey: '/distribution' },
  { key: 'complaint', label: '客诉管理', menuKey: '/complaints' },
  { key: 'homework', label: '作业管理', menuKey: '/homework' },
  { key: 'score', label: '成绩管理', menuKey: '/scores' },
  { key: 'teaching', label: '在线课堂/督学', menuKey: '/teaching' },
  { key: 'courseware', label: '课件管理', menuKey: '/coursewares' },
  { key: 'resource', label: '资源库', menuKey: '/resources' },
];

/** menuKey -> feature key 的反查表（用于菜单过滤） */
export const MENU_KEY_TO_FEATURE: Record<string, string> = Object.fromEntries(
  TENANT_FEATURES.map((f) => [f.menuKey, f.key]),
);
