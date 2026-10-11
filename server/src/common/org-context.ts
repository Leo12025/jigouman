import { AsyncLocalStorage } from 'async_hooks';

/**
 * 校区上下文：在请求生命周期内携带"当前校区(orgId)"。
 * 由 TenantGuard 写入（读取 X-Org-Id 或员工所属校区），
 * BaseService 读取后对带 org_id 列的实体自动按校区隔离/落章，实现"校区独立"。
 * 无 orgId 上下文时返回 undefined —— 即总校区/租户级视角（可见全部）。
 */
export interface OrgCtx {
  orgId?: number;
}

export const orgAls = new AsyncLocalStorage<OrgCtx>();

export const getOrgId = (): number | undefined => orgAls.getStore()?.orgId;
