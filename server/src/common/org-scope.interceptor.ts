import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { orgAls } from './org-context';
import { orgScopeSetAls, orgScopeAllAls } from './org-scope';
import { AuthUser } from './decorators/auth.decorator';

import { LruCache } from './lru-cache';

const SUBTREE_TTL = Number(process.env.ORG_SUBTREE_TTL_MS) || 60_000;
/**
 * 组织子树缓存（TTL + LRU 上限）：组织树极少变更，缓存可避免 ORG_AND_BELOW 每请求查库。
 * 裸 Map 会让 key(tenantId:orgId) 只增不减，故限制条数并淘汰最久未使用。
 */
const subtreeCache = new LruCache<number[]>({ max: 2000, ttlMs: SUBTREE_TTL });

/**
 * 校区级作用域拦截器（★S0 安全补丁，对应架构文档 P0-1 / P1 数据范围）。
 *
 * 运行时机：JWT 守卫之后、路由 Handler 之前，此时 req.user 已由 JwtStrategy 挂载。
 * 职责（OWASP：客户端租户/校区标识仅作 selector，须由已验证身份校验）：
 *   1. 解析 X-Org-Id（前端校区切换器下发）；
 *   2. 若用户归属校区 orgIds 非空：
 *        - 显式篡改成「不在归属列表」的校区 → 403；
 *        - 未选/选「全部」(header 为空) → 默认落到其首个归属校区（不泄漏其它校区）；
 *   3. 按角色 dataScope 决定查询范围：
 *        - all            → 全部校区（不注入过滤）；
 *        - org_and_below  → org_id IN (本校区及其子树)，支持「大区/分校/校区」层级；
 *        - org            → org_id IN (本校区)；
 *        - self/未定义     → 沿用单校区 X-Org-Id 过滤（行级"仅本人"由业务层处理）；
 *   4. 用 orgAls / orgScopeSetAls / orgScopeAllAls 三层 AsyncLocalStorage 覆盖本次请求上下文，
 *      使 orgRepo 代理 / BaseService 的过滤生效。
 *
 * 跨租户隔离由 tenant_id（来自 JWT，已在各服务 where 强制）保证，本拦截器只负责校区级。
 */
@Injectable()
export class OrgScopeInterceptor implements NestInterceptor {
  constructor(@Inject(DataSource) private readonly ds: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;

    const header = req.header('X-Org-Id');
    const requested =
      header && !Number.isNaN(Number(header)) ? Number(header) : null;

    const orgIds = user?.orgIds?.length ? user.orgIds : null;

    let effective: number | null = requested;
    if (orgIds) {
      if (requested != null && !orgIds.includes(requested)) {
        throw new ForbiddenException('无权访问该校区');
      }
      // 未指定（选「全部校区」或清空）→ 默认首个归属校区，避免越权看到全租户
      effective = requested != null ? requested : orgIds[0];
    }

    // 范围计算可能异步查子树（organizations 表），用 from+mergeMap 保持返回 Observable，
    // 且 next.handle() 在 run() 同步回调内被订阅，async_hooks 上下文可正确传播到下游 Service。
    return from(this.computeScope(user, effective, user?.dataScope)).pipe(
      mergeMap(({ scopeSet, scopeAll }) =>
        orgAls.run({ orgId: effective ?? undefined }, () =>
          orgScopeSetAls.run(scopeSet, () =>
            orgScopeAllAls.run(scopeAll, () => next.handle()),
          ),
        ),
      ),
    );
  }

  private async computeScope(
    user: AuthUser | undefined,
    effective: number | null,
    dsScope: AuthUser['dataScope'],
  ): Promise<{ scopeSet: number[] | null; scopeAll: boolean }> {
    let scopeSet: number[] | null = null;
    let scopeAll = false;

    if (dsScope === 'all') {
      scopeAll = true;
    } else if (dsScope === 'org_and_below') {
      const base = effective ?? (user?.orgIds && user.orgIds[0]) ?? null;
      if (base != null) scopeSet = await this.subtree(user!.tenantId, base);
      else scopeAll = true; // 无基准校区时退化为全部可见（罕见）
    } else if (dsScope === 'org' && effective != null) {
      scopeSet = [effective];
    }

    return { scopeSet, scopeAll };
  }

  /** 查询某组织的子树 id 集合（含自身），用于 ORG_AND_BELOW；结果带 TTL 缓存 */
  private async subtree(tenantId: number, orgId: number): Promise<number[]> {
    const key = `${tenantId}:${orgId}`;
    const cached = subtreeCache.get(key);
    if (cached) return cached;
    const rows = await this.ds.query(
      `SELECT id FROM organizations WHERE tenant_id = ? AND (id = ? OR ancestors LIKE ?)`,
      [tenantId, orgId, `${orgId}/%`],
    );
    const ids = (rows as any[]).map((r) => r.id);
    subtreeCache.set(key, ids);
    return ids;
  }
}
