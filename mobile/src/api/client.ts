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
  (error: AxiosError<ApiBody<unknown>>) => {
    const status = error.response?.status;
    // 家长端刷新令牌走 /parents/login 重新 OTP 登录，401 直接回登录页
    if (status === 401) redirectToLogin();
    const body = error.response?.data;
    Toast.show({ content: body?.message || error.message || '网络异常' });
    return Promise.reject(error);
  },
);

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
