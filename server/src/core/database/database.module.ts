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
    // 使用 sql.js（纯 WASM）做本地/单测库，零原生依赖。
    // 内存态：进程重启数据清空，适合本地调试与自动化测试。
    // 显式传入 driver 以规避 sql.js 的 CJS/ESM 互操作问题。
    const sqljsMod: any = require('sql.js');
    return {
      type: 'sqljs',
      driver: sqljsMod.default || sqljsMod,
      autoSave: false,
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
