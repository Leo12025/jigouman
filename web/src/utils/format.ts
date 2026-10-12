import dayjs from 'dayjs';

/** 将 ISO 时间字符串格式化为 'YYYY-MM-DD HH:mm:ss'；空值返回占位符 */
export function formatDateTime(v?: string | null, empty = '-'): string {
  if (!v) return empty;
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : empty;
}

/** 格式化为 'YYYY-MM-DD' */
export function formatDate(v?: string | null, empty = '-'): string {
  if (!v) return empty;
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY-MM-DD') : empty;
}

/** 金额格式化，单位元 */
export function formatMoney(v?: number | null, empty = '-'): string {
  if (v == null || Number.isNaN(v)) return empty;
  return `¥${v.toFixed(2)}`;
}
