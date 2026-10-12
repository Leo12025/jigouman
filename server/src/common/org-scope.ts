import { Repository, In } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import { getOrgId } from './org-context';

/**
 * 校区隔离助手：给不使用 BaseService 的模块提供与 BaseService 一致的 org_id 过滤能力。
 * 过滤优先级（由请求级上下文决定）：
 *   1) orgScopeAll=true            → 全部校区可见，不注入任何过滤（租户级视角）
 *   2) orgScopeSet=[ids]           → org_id IN (ids)，用于 ORG_AND_BELOW（本校区及下级）
 *   3) 单校区 X-Org-Id             → org_id = :orgId（传统单校区视角）
 *   4) 无上下文                     → 不注入（旧行为）
 * 仅对带 orgId 列的实体生效。
 */
const hasOrgCache = new WeakMap<object, boolean>();

function hasOrgColumn(repo: Repository<any>): boolean {
  const key = repo.metadata as object;
  let v = hasOrgCache.get(key);
  if (v === undefined) {
    v = repo.metadata.columns.some((c) => c.propertyName === 'orgId');
    hasOrgCache.set(key, v);
  }
  return v;
}

/** 校区范围集合（子树）：激活时按 org_id IN (ids) 过滤 */
export const orgScopeSetAls = new AsyncLocalStorage<number[] | null>();
/** 全部校区可见开关：激活时不做任何校区过滤 */
export const orgScopeAllAls = new AsyncLocalStorage<boolean>();

export const getOrgScopeSet = (): number[] | undefined =>
  orgScopeSetAls.getStore() as number[] | undefined;
export const getOrgScopeAll = (): boolean => orgScopeAllAls.getStore() === true;

/** 解析当前应注入的校区过滤条件（见文件头优先级） */
export function resolveOrgFilter(repo: Repository<any>): Record<string, any> | null {
  if (!hasOrgColumn(repo)) return null;
  if (getOrgScopeAll()) return {};
  const set = getOrgScopeSet();
  if (set && set.length) return { orgId: In(set) };
  const orgId = getOrgId();
  if (orgId != null) return { orgId };
  return {};
}

/** 合并校区条件到 where（读：隔离；写：见 orgStamp） */
export function orgScope<T extends Record<string, any>>(repo: Repository<any>, where: T): T {
  const f = resolveOrgFilter(repo);
  if (!f || Object.keys(f).length === 0) return where;
  return { ...where, ...f } as T;
}

/** 写入时给实体落校区章（仅在有 orgId 列且有校区上下文时） */
export function orgStamp<T extends Record<string, any>>(repo: Repository<any>, entity: T): T {
  const orgId = getOrgId();
  if (orgId == null || !hasOrgColumn(repo)) return entity;
  (entity as any).orgId = orgId;
  return entity;
}

/** 当前请求是否处于某个校区视角（true=已选校区；false=全部校区/总校区） */
export const inOrgScope = (): boolean => getOrgId() != null;

/**
 * 仓库代理：包裹 Repository，使其 find/findOne/findAndCount/count 自动按校区过滤，
 * create/save 自动落 org_id 章。用于未走 BaseService 的模块（如订单/课时/考勤/作业），
 * 一次包裹即覆盖该 repo 的全部查询，与 BaseService 语义一致；无校区上下文时行为不变。
 */
const scoped = new WeakMap<object, unknown>();

export function orgRepo<T>(repo: Repository<any>): Repository<any> {
  if (!hasOrgColumn(repo)) return repo;
  const cached = scoped.get(repo);
  if (cached) return cached as Repository<any>;

  const proxy = new Proxy(repo, {
    get(target: any, prop: string | symbol) {
      const orig = target[prop];
      if (typeof orig !== 'function') return orig;

      if (['find', 'findOne', 'findAndCount', 'count', 'findBy', 'findOneBy'].includes(String(prop))) {
        return (options: any) => {
          const f = resolveOrgFilter(target);
          // 实体无 org 列、或 where 为数组(OR 组合)时不改写，避免语义歧义
          if (!f || Array.isArray(options?.where)) {
            return orig.call(target, options);
          }
          const where = options?.where;
          // 即便调用方未传 where，也注入校区范围（org_and_below/all 依赖此路径）
          const merged = { ...(options || {}) };
          merged.where = where ? { ...where, ...f } : f;
          return orig.call(target, merged);
        };
      }
      if (prop === 'create') {
        return (...args: any[]) => {
          const e = orig.apply(target, args);
          const orgId = getOrgId();
          if (orgId != null && e && typeof e === 'object') (e as any).orgId = orgId;
          return e;
        };
      }
      if (prop === 'save') {
        return (entity: any, ...rest: any[]) => {
          const orgId = getOrgId();
          if (orgId != null && entity && typeof entity === 'object') {
            if (Array.isArray(entity)) entity.forEach((x) => x && (x.orgId = orgId));
            else (entity as any).orgId = orgId;
          }
          return orig.call(target, entity, ...rest);
        };
      }
      return orig.bind(target);
    },
  });
  scoped.set(repo, proxy);
  return proxy as Repository<any>;
}
