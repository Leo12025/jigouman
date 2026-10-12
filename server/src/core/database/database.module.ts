import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * 数据库模块（文档 §3）。
 * - 生产/联调：MySQL 8（默认）。单库多租户，软删除。
 * - 本地无 Docker / 单测：DB_TYPE=sqlite 使用文件或内存库，零外部依赖即可启动与测试。
 * 实体自动扫描 src 下所有 *.entity.ts 文件。
 */
function buildOptions(cfg: ConfigService): TypeOrmModuleOptions {
  const dbType = (cfg.get('DB_TYPE') || 'mysql') as 'mysql' | 'sqlite';
  const synchronize = cfg.get('DB_SYNCHRONIZE') === 'true';
  const logging = cfg.get('DB_LOGGING') === 'true';

  // 实体由各业务模块的 forFeature 注册（autoLoadEntities），
  // 避免 glob 在 ts-jest / 不同编译目标下找不到 *.entity.js。
  const base = { autoLoadEntities: true, synchronize, logging };

  if (dbType === 'sqlite') {
    // better-sqlite3：原生 SQLite 驱动。项目固定 Node 22，ABI 稳定，
    // 无需 Docker/MySQL，装上即可启动与跑测试；同步驱动，性能与类型行为优于 sql.js。
    // DB_SQLITE_PATH：:memory:（默认，进程重启清空）或本地文件路径（如 ./data.db，便于调试落盘）。
    return {
      type: 'better-sqlite3',
      database: cfg.get('DB_SQLITE_PATH') || ':memory:',
      ...base,
    } as TypeOrmModuleOptions;
  }

  return {
    type: 'mysql',
    host: cfg.get('DB_HOST'),
    port: Number(cfg.get('DB_PORT')),
    username: cfg.get('DB_USERNAME'),
    password: cfg.get('DB_PASSWORD'),
    database: cfg.get('DB_DATABASE'),
    charset: 'utf8mb4',
    timezone: '+08:00',
    // 连接池与超时：避免慢 DB 下连接建立/获取阻塞逼近 15s 客户端超时
    extra: {
      connectionLimit: Number(cfg.get('DB_POOL_SIZE')) || 10,
      connectTimeout: 10_000,
      acquireTimeout: 10_000,
    },
    ...base,
  } as TypeOrmModuleOptions;
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildOptions,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
