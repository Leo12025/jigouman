import axios, { AxiosError } from 'axios';
import { message } from 'antd';

export const TOKEN_KEY = 'jm_token';
export const REFRESH_KEY = 'jm_refresh';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || '';
export const setTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

/** 统一响应体（文档 §6：{ code, message, data, traceId }） */
interface ApiBody<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 15000,
});

http.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

/** 刷新令牌（并发请求只触发一次） */
let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await axios.post<ApiBody<{ accessToken: string }>>(
      `${import.meta.env.VITE_API_BASE || '/api/v1'}/auth/refresh`,
      { refreshToken: rt },
    );
    if (res.data?.code === 0 && res.data.data?.accessToken) {
      setTokens(res.data.data.accessToken);
      return res.data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  clearToken();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// 业务码 0 视为成功；HTTP 401 时先用 refreshToken 续期并重放一次，失败才跳登录
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiBody<unknown>>) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    if (status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing = refreshing || doRefresh().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        original.headers = original.headers || ({} as any);
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return http.request(original);
      }
      redirectToLogin();
    }
    const body = error.response?.data;
    if (body?.message) message.error(body.message);
    else message.error(error.message || '网络异常');
    return Promise.reject(error);
  },
);

async function unwrap<T>(p: Promise<{ data: ApiBody<T> }>): Promise<T> {
  const res = await p;
  const body = res.data;
  if (!body || typeof body.code === 'undefined') return body as any;
  if (body.code !== 0) {
    message.error(body.message || '请求失败');
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

/** 文件下载（后端生成文件流）：拿 Blob 触发浏览器下载，文件名取自 Content-Disposition */
export async function downloadFile(
  url: string,
  opts?: { method?: 'GET' | 'POST'; data?: any; fallbackName?: string },
): Promise<void> {
  const res = await http.request({
    url,
    method: opts?.method || 'GET',
    data: opts?.data,
    responseType: 'blob',
  });
  const blob = res.data as Blob;
  const cd = res.headers['content-disposition'] as string | undefined;
  let filename = opts?.fallbackName || 'download';
  if (cd) {
    const m = cd.match(/filename="?([^";]+)"?/);
    if (m) filename = decodeURIComponent(m[1]);
  }
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}
