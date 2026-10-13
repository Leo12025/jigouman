import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

/**
 * 独立 DataSource，仅供 `npm run migration:run`（生产/联调 MySQL）使用。
 * 与 app 的 DatabaseModule 保持一致的连接参数来源（环境变量）。
 * - 开发/单测使用 synchronize（见 database.module），不跑迁移；
 * - 生产使用本数据源跑迁移，schema 由迁移文件全权管理。
 *
 * 注意：迁移只依赖 migrations 目录内的文件，无需扫描业务实体，
 * 因此此处不设置 entities（避免 ts/jest 与编译产物路径差异）。
 */
const dbType = (process.env.DB_TYPE || 'mysql') as 'mysql' | 'sqlite';

const common = {
  migrations: [join(__dirname, 'migrations', '*.ts')],
  migrationsRun: false,
  synchronize: false,
};

let options: DataSourceOptions;
if (dbType === 'sqlite') {
  options = {
    type: 'better-sqlite3',
    database: process.env.DB_SQLITE_PATH || './data.db',
    ...common,
  } as DataSourceOptions;
} else {
  options = {
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'jigouman',
    charset: 'utf8mb4',
    timezone: '+08:00',
    ...common,
  } as DataSourceOptions;
}

/** 仅导出一个 DataSource 实例：TypeORM CLI 要求数据源文件必须且只能有一个导出 */
export const AppDataSource = new DataSource(options);
