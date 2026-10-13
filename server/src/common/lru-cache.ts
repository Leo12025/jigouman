/**
 * 轻量 LRU + TTL 缓存。
 *
 * 用途：替换散落在各服务里的「Map + 只判过期、从不淘汰」写法。
 * 这类写法有两个问题：
 *   1) 旧 key 永久驻留 —— 若 key 来自客户端输入（如 Host 头），可被远程触发成内存泄漏；
 *   2) 无上限 —— 随 key 基数线性增长。
 * 因此凡进程内缓存都应同时具备「TTL」与「条数上限」。
 */
export interface LruOptions {
  /** 最大条数，超出后淘汰最久未使用的条目（默认 1000） */
  max?: number;
  /** 存活毫秒数，超出即视为未命中（默认不设置 TTL） */
  ttlMs?: number;
}

export class LruCache<V> {
  private readonly max: number;
  private readonly ttlMs?: number;
  private readonly m = new Map<string, { v: V; ts: number }>();

  constructor(opts: LruOptions = {}) {
    this.max = Math.max(1, opts.max ?? 1000);
    this.ttlMs = opts.ttlMs;
  }

  /** 命中返回缓存值；未命中/已过期返回 undefined（并顺手清理过期项） */
  get(key: string): V | undefined {
    const e = this.m.get(key);
    if (!e) return undefined;
    if (this.ttlMs != null && Date.now() - e.ts > this.ttlMs) {
      this.m.delete(key);
      return undefined;
    }
    // 刷新热度：重新插入到 Map 尾部，使其成为「最近使用」
    this.m.delete(key);
    this.m.set(key, e);
    return e.v;
  }

  /** 写入并刷新热度；超上限时淘汰最久未使用条目 */
  set(key: string, v: V): void {
    if (this.m.has(key)) this.m.delete(key);
    this.m.set(key, { v, ts: Date.now() });
    while (this.m.size > this.max) {
      const oldest = this.m.keys().next().value;
      if (oldest === undefined) break;
      this.m.delete(oldest);
    }
  }

  del(key: string): void {
    this.m.delete(key);
  }

  clear(): void {
    this.m.clear();
  }

  get size(): number {
    return this.m.size;
  }
}
