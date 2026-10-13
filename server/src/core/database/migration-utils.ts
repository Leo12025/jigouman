import { QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/**
 * 迁移工具：统一走 TypeORM Schema API，**不写 MySQL 专用 SQL**。
 * 这样同一套迁移既能跑生产 MySQL，也能跑本地 sqlite（DB_TYPE=sqlite）用于验证。
 *
 * 注意：本文件放在 migrations 目录之外，避免被 migrations glob 当作迁移类加载。
 */

/** 列不存在才添加（幂等） */
export async function addColumnIfMissing(
  qr: QueryRunner,
  table: string,
  column: TableColumn,
): Promise<void> {
  if (await qr.hasColumn(table, column.name)) return;
  await qr.addColumn(table, column);
}

/** 索引不存在才创建（幂等） */
export async function ensureIndex(
  qr: QueryRunner,
  table: string,
  name: string,
  columnNames: string[],
  isUnique = false,
): Promise<void> {
  const t = await qr.getTable(table);
  if (!t) return;
  if (t.indices.some((i) => i.name === name)) return;
  await qr.createIndex(table, new TableIndex({ name, columnNames, isUnique }));
}

/** 表不存在才创建（幂等） */
export async function createTableIfMissing(qr: QueryRunner, table: Table): Promise<void> {
  if (await qr.getTable(table.name)) return;
  await qr.createTable(table, true);
}

/** 业务表通用列：id / tenant_id / org_id / 时间戳 / 软删除 */
export function baseColumns(): TableColumn[] {
  return [
    new TableColumn({
      name: 'id', type: 'bigint', isPrimary: true, isGenerated: true,
      generationStrategy: 'increment',
    }),
    new TableColumn({ name: 'tenant_id', type: 'bigint', default: '0' }),
    new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
    new TableColumn({ name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' }),
    new TableColumn({ name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' }),
    new TableColumn({ name: 'deleted_at', type: 'datetime', isNullable: true }),
  ];
}

/** 金额列 */
export function moneyColumn(name: string, precision = 12, scale = 2): TableColumn {
  return new TableColumn({
    name, type: 'decimal', precision, scale, default: '0',
  });
}
