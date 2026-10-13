import { RequestHandler } from 'express';
import { gzipSync, constants as zlibConstants } from 'zlib';

/** 小于该阈值的响应不压缩：压缩 CPU 开销大于传输收益 */
export const COMPRESS_THRESHOLD = Number(process.env.COMPRESS_THRESHOLD) || 2048;

/**
 * JSON 响应压缩（gzip）：用 Node 内置 zlib 实现，**不引入额外依赖**。
 *
 * 只包裹 `res.json` —— 业务接口全部走该方法；
 * CSV/PDF 等文件流走 `res.download`/流式写入，不受影响，保持原样。
 *
 * 看板与列表接口返回体较大，压缩可显著降低传输缓冲与带宽占用。
 */
export const jsonCompression: RequestHandler = (req, res, next) => {
  // 静态文件已按内容类型分发，不做压缩
  if (req.path.startsWith('/files')) return next();
  if (!/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) return next();

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    let payload: Buffer;
    try {
      payload = Buffer.from(JSON.stringify(body));
    } catch {
      return originalJson(body); // 循环引用等：退回未压缩
    }
    if (payload.length < COMPRESS_THRESHOLD) return originalJson(body);
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.removeHeader('Content-Length');
    res.end(gzipSync(payload, { level: zlibConstants.Z_BEST_SPEED }));
    return res;
  };
  next();
};

/**
 * 健康探针：供 LB / K8s 探活与内存监控告警。
 * `memory.heapUsage` 为堆使用率（heapUsed/heapTotal），超过 0.8 可设告警。
 */
export const healthHandler: RequestHandler = (_req, res) => {
  const m = process.memoryUsage();
  const heapTotal = m.heapTotal || 1;
  res.json({
    status: 'ok',
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    memory: {
      rssMB: Math.round(m.rss / 1048576),
      heapUsedMB: Math.round(m.heapUsed / 1048576),
      heapTotalMB: Math.round(m.heapTotal / 1048576),
      externalMB: Math.round(m.external / 1048576),
      heapUsage: Number((m.heapUsed / heapTotal).toFixed(4)),
    },
  });
};
