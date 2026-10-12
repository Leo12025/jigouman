import { useState, useCallback } from 'react';
import { App } from 'antd';

export interface CrudListResult<T> {
  list: T[];
  total: number;
}

export interface UseCrudConfig<T> {
  /** 分页列表接口：必须，参数为 { page, size } */
  list: (params: { page: number; size: number }) => Promise<CrudListResult<T>>;
  /** 新增接口（可选：仅查看页可不传） */
  create?: (data: Record<string, unknown>) => Promise<unknown>;
  /** 更新接口：传入编辑行 id */
  update?: (id: number, data: Record<string, unknown>) => Promise<unknown>;
  /** 删除接口 */
  remove?: (id: number) => Promise<unknown>;
  /** 每页条数，默认 20 */
  size?: number;
}

/**
 * 通用 CRUD 状态机：收敛列表页重复的 rows/total/page/size/loading、
 * 增删改提交与提示逻辑。
 * - 通过 App.useApp() 获取 message 实例，遵循 AntD5 上下文规范（继承 ConfigProvider 主题/国际化）
 * - 提交期间 submitting=true，供 Modal.confirmLoading 防重复提交
 * - list 用 useCallback 稳定并可作为 refreshDeps；错误由请求层统一提示
 */
export function useCrud<T = Record<string, unknown>>(config: UseCrudConfig<T>) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(config.size ?? 20);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (p = page, s = size) => {
      setLoading(true);
      try {
        const res = await config.list({ page: p, size: s });
        setRows(res?.list ?? []);
        setTotal(res?.total ?? 0);
        setPage(p);
        setSize(s);
      } catch {
        // 失败提示已由请求层（api/client.ts）统一处理，这里仅阻止异常外抛
      } finally {
        setLoading(false);
      }
    },
    [config.list, page, size],
  );

  const save = useCallback(
    async (editing: T | null, data: Record<string, unknown>): Promise<boolean> => {
      const id = (editing as { id?: number } | null)?.id;
      if (editing && !config.update) return false;
      if (!editing && !config.create) return false;
      setSubmitting(true);
      try {
        if (editing && config.update && id != null) {
          await config.update(id, data);
          message.success('已保存');
        } else if (config.create) {
          await config.create(data);
          message.success('创建成功');
        }
        await load();
        return true;
      } catch {
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [config.create, config.update, message, load],
  );

  const del = useCallback(
    async (id: number): Promise<boolean> => {
      if (!config.remove) return false;
      try {
        await config.remove(id);
        message.success('已删除');
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [config.remove, message, load],
  );

  return { rows, total, page, size, loading, submitting, setPage, setSize, load, save, del };
}
