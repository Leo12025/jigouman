import axios, { AxiosError } from 'axios';
import { createElement } from 'react';
import { Modal, message } from 'antd';

export const TOKEN_KEY = 'jm_token';
export const REFRESH_KEY = 'jm_refresh';
/** 当前选中的校区(org_id)；空字符串=全部/总校区视角 */
export const CURRENT_ORG_KEY = 'jm_current_org';

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

/** 当前校区：null=全部(总校区可见)；number=仅该校区 */
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
  // 校区上下文：校区切换器写入 localStorage，统一在此下发 X-Org-Id
  const org = getCurrentOrg();
  if (org != null) cfg.headers['X-Org-Id'] = String(org);
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
    // 合规二次确认：由调用方弹窗处理，此处不再重复 toast
    if ((body as any)?.data?.needConfirm === true) return Promise.reject(error);
    if (body?.message) message.error(body.message);
    else message.error(error.message || '网络异常');
    return Promise.reject(error);
  },
);

// ---------- 合规二次确认（预收费监管上限） ----------

export interface ComplianceConfirmPayload {
  needConfirm: true;
  violations: string[];
  hint?: string;
}

/** 从异常中取出合规确认信息；非合规拦截返回 null */
export function getComplianceConfirm(e: any): ComplianceConfirmPayload | null {
  const d = e?.response?.data?.data ?? e?.data;
  return d && d.needConfirm === true ? (d as ComplianceConfirmPayload) : null;
}

function confirmModal(ce: ComplianceConfirmPayload): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '超出预收费监管上限',
      width: 480,
      okText: '继续',
      cancelText: '取消',
      content: createElement(
        'div',
        null,
        createElement('div', { style: { marginBottom: 8 } }, '该操作存在以下合规风险：'),
        createElement(
          'ul',
          { style: { paddingLeft: 20, margin: 0 } },
          ce.violations.map((v, i) => createElement('li', { key: i }, v)),
        ),
        createElement(
          'div',
          { style: { marginTop: 8, color: '#888' } },
          '确认继续将由本机构承担相应责任。',
        ),
      ),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * 合规二次确认包裹器：
 * 先按原参数请求一次；若命中 needConfirm，弹窗展示全部违规项，
 * 用户点「继续」后自动携带 confirmCompliance=true 重发。
 *
 * 用法：
 *   await withComplianceConfirm((extra) => createCoursePackage({ ...values, ...extra }));
 */
export async function withComplianceConfirm<T>(
  run: (extra: { confirmCompliance?: boolean }) => Promise<T>,
): Promise<T> {
  try {
    return await run({});
  } catch (e: any) {
    const ce = getComplianceConfirm(e);
    if (!ce) throw e;
    const ok = await confirmModal(ce);
    if (!ok) throw e;
    return await run({ confirmCompliance: true });
  }
}

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
