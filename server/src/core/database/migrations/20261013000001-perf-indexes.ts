import { MigrationInterface, QueryRunner } from 'typeorm';
import { ensureIndex } from '../migration-utils';

/**
 * 性能索引迁移（解决接口 15s 超时的一部分根因）：
 *  - organizations(tenant_id, ancestors)：加速 ORG_AND_BELOW 子树查询（拦截器每请求一次）；
 *  - role_permission(role_id)：加速登录时角色权限图的级联加载。
 * 幂等：按显式索引名判重，已存在则跳过。
 */
export class PerfIndexes20261013000001 implements MigrationInterface {
  name = 'PerfIndexes20261013000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureIndex(
      queryRunner, 'organizations', 'idx_organizations_tenant_ancestors',
      ['tenant_id', 'ancestors'],
    );
    await ensureIndex(
      queryRunner, 'role_permission', 'idx_role_permission_role',
      ['role_id'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('organizations', 'idx_organizations_tenant_ancestors').catch(() => undefined);
    await queryRunner.dropIndex('role_permission', 'idx_role_permission_role').catch(() => undefined);
  }
}
