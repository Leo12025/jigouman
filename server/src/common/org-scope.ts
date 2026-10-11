import { Repository } from 'typeorm';
import { getOrgId } from './org-context';

/**
 * 校区隔离助手：给不使用 BaseService 的模块提供与 BaseService 一致的 org_id 过滤能力。
 * 仅当实体带 orgId 列、且当前请求携带校区上下文(X-Org-Id)时才追加 orgId 条件；
 * 否则原样返回（总校区/租户级视角，可见全部），保证旧行为零回归。
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

/** 合并校区条件到 where（读：隔离；写：见 orgStamp） */
export function orgScope<T extends Record<string, any>>(repo: Repository<any>, where: T): T {
  const orgId = getOrgId();
  if (orgId == null || !hasOrgColumn(repo)) return where;
  return { ...where, orgId } as T;
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
          const orgId = getOrgId();
          // 无校区上下文、或 where 为数组(OR 组合)时不改写，避免语义歧义
          if (orgId == null || Array.isArray(options?.where)) {
            return orig.call(target, options);
          }
          const where = options?.where ? { ...options.where, orgId } : { orgId };
          return orig.call(target, { ...(options || {}), where });
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
