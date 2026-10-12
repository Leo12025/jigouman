import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { getTenantMe } from '../api/crm';
import { getToken } from '../api/client';
import { themeTokens } from '../theme';

export interface TenantConfig {
  brand?: { logo?: string; contactPhone?: string; contactEmail?: string; address?: string };
  theme?: { primaryColor?: string };
  language?: 'zh-CN' | 'en-US';
  features?: Record<string, boolean>;
}

interface TenantConfigCtx {
  config: TenantConfig;
  loading: boolean;
  reload: () => Promise<void>;
}

const Ctx = createContext<TenantConfigCtx>({ config: {}, loading: true, reload: async () => {} });
export const useTenantConfig = () => useContext(Ctx);

/**
 * 启动时拉取当前租户的结构化配置，供全局套用：
 * - 主题色 / 语言 经 ThemedConfigProvider 注入 antd ConfigProvider（实时生效）
 * - 功能开关 供侧边栏菜单过滤
 * GET /tenant/me 对全员开放，无需 tenant:manage，确保主题对普通员工也生效。
 */
export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const t = await getTenantMe();
      setConfig(t?.config || {});
    } catch {
      // 无权限或网络异常时静默：不影响主流程
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return <Ctx.Provider value={{ config, loading, reload }}>{children}</Ctx.Provider>;
}

/** 根据租户 config 动态应用 antd 主题（主色）与组件语言 */
export function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const { config } = useTenantConfig();
  const primary = config?.theme?.primaryColor;
  const locale = config?.language === 'en-US' ? enUS : zhCN;
  return (
    <ConfigProvider
      locale={locale}
      theme={{ token: { ...themeTokens, colorPrimary: primary || themeTokens.colorPrimary } }}
    >
      {children}
    </ConfigProvider>
  );
}
