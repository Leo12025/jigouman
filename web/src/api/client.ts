import axios from 'axios';
import { message } from 'antd';

export const TOKEN_KEY = 'jm_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

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
