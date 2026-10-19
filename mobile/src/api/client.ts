import axios, { AxiosError } from 'axios';
import { Toast } from 'antd-mobile';

/** 移动端 token（家长/老师/顾问共用，与 PC 管理后台隔离） */
export const TOKEN_KEY = 'jm_mobile_token';
export const REFRESH_KEY = 'jm_mobile_refresh';
/** 当前角色：parent 家长 / teacher 老师 / consultant 顾问 */
export const ROLE_KEY = 'jm_mobile_role';
export type Role = 'parent' | 'teacher' | 'consultant';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || '';
export const getRole = (): Role => (localStorage.getItem(ROLE_KEY) as Role) || 'parent';
export const setRole = (r: Role) => localStorage.setItem(ROLE_KEY, r);

/**
 * 按域名锁定移动端角色：域名含 staff → 老师，含 parent → 家长，含 sale → 顾问。
 * 命中后仅暴露对应端入口，其余端入口隐藏（详见 LoginPage / Guard）。
 * 命中规则不冲突（staff/parent/sale 互不包容）；均未命中返回 null（不锁定，三端任选）。
 */
export function getDomainRole(): Role | null {
  const h = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase();
  if (h.includes('staff')) return 'teacher';
  if (h.includes('parent')) return 'parent';
  if (h.includes('sale')) return 'consultant';
  return null;
}

/** 当前校区(org_id)；空=全部/总校区视角。家长/员工移动端按此下发 X-Org-Id 实现校区切换 */
export const CURRENT_ORG_KEY = 'jm_mobile_org';
export const getCurrentOrg = (): number | null => {
  const v = localStorage.getItem(CURRENT_ORG_KEY);
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
export const setCurrentOrg = (orgId: number | null) => {
  if (orgId == null) localStorage.removeItem(CURRENT_ORG_KEY);
  else localStorage.setItem(CURRENT_ORG_KEY, String(orgId));
};

/** 解码当前 JWT payload（无需后端），用于"我的"页展示账号信息 */
export function decodeJwt(): Record<string, any> | null {
  const t = getToken();
  const seg = t.split('.');
  if (seg.length !== 3) return null;
  try {
    const b64 = seg[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(window.atob(b64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
export const setTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
};

/** 统一响应体（文档 §6：{ code, message, data, traceId }），业务码 0 为成功 */
interface ApiBody<T> {
  code: number;
  message: string;
  data: T;
}

const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const http = axios.create({ baseURL: BASE, timeout: 15000 });

http.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  const org = getCurrentOrg();
  if (org != null) cfg.headers['X-Org-Id'] = String(org);
  return cfg;
});

function redirectToLogin() {
  clearToken();
  if (!window.location.hash.startsWith('#/login')) {
    window.location.href = '#/login';
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiBody<unknown>>) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    // 401：先用 refreshToken 续期并重放一次原请求；失败才回登录页
    if (status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const newToken = await doRefresh();
        if (newToken) {
          original.headers = original.headers || ({} as any);
          (original.headers as any).Authorization = `Bearer ${newToken}`;
          return http.request(original);
        }
      } catch {
        /* 续期失败，走下方登出 */
      }
      clearToken();
      redirectToLogin();
    }
    const body = error.response?.data;
    Toast.show({ content: body?.message || error.message || '网络异常' });
    return Promise.reject(error);
  },
);

/** 刷新访问令牌（家长/员工令牌均 type=refresh，统一走 /auth/refresh；并发只触发一次） */
let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await axios.post<ApiBody<{ accessToken: string; refreshToken?: string }>>(
        `${BASE}/auth/refresh`,
        { refreshToken: rt },
      );
      const data = res.data?.data;
      if (data?.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * 列表接口安全解包：无论后端返回数组 / {list:[...]} / {rows:[...]} / null，
 * 统一返回数组，避免 setX(null) 后在渲染期 .map 崩溃白屏。
 */
export async function getList<T = any>(p: Promise<any>): Promise<T[]> {
  const r = await p.catch(() => null);
  if (Array.isArray(r)) return r as T[];
  if (r && Array.isArray((r as any).list)) return (r as any).list as T[];
  if (r && Array.isArray((r as any).rows)) return (r as any).rows as T[];
  return [] as T[];
}

async function unwrap<T>(p: Promise<{ data: ApiBody<T> }>): Promise<T> {
  const res = await p;
  const body = res.data;
  if (!body || typeof body.code === 'undefined') return body as any;
  if (body.code !== 0) {
    Toast.show({ content: body.message || '请求失败' });
    throw new Error(body.message || '请求失败');
  }
  return body.data;
}

export const apiGet = <T = any>(url: string, params?: any): Promise<T> =>
  unwrap<T>(http.get(url, { params }) as any);
export const apiPost = <T = any>(url: string, data?: any): Promise<T> =>
  unwrap<T>(http.post(url, data) as any);
export const apiPut = <T = any>(url: string, data?: any): Promise<T> =>
  unwrap<T>(http.put(url, data) as any);
export const apiDelete = <T = any>(url: string): Promise<T> =>
  unwrap<T>(http.delete(url) as any);
