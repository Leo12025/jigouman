import { useState, useEffect, useCallback } from 'react';
import { getList } from '../api/client';

/**
 * 统一接口请求三态：loading / error / data。
 * - fetcher 返回的列表会被 getList 规整为数组，避免 null 渲染崩溃。
 * - 异常由 client 拦截器统一 Toast，这里额外提供 error + onRetry 用于整页错误态。
 */
export function useApi<T = any>(
  fetcher: () => Promise<T>,
  opts?: { isList?: boolean; deps?: any[] },
) {
  const isList = opts?.isList ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const req = fetcher();
    // 列表页 getList 会吞掉异常返回 []，这里单独捕获真实请求错误以驱动 error 态
    let failed = false;
    req.catch(() => {
      failed = true;
      setError(true);
    });
    const p = isList ? (getList(req) as unknown as Promise<T>) : req;
    p.then((d) => {
      if (!failed) setData(d);
    })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, opts?.deps || []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, loading, error, reload: load };
}
