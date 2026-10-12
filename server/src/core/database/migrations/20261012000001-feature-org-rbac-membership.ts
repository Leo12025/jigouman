import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from 'typeorm';

/**
 * 架构改造 P1 / P1-3 / P2 的schema迁移：
 *  - organizations.ancestors   : 组织祖先路径（斜杠包围，如 /5/9/），支撑 ORG_AND_BELOW 子树查询；
 *  - role.inherits_from        : 角色继承平台模板（tenant_id=0），实现"模板+覆盖"授权模型；
 *  - membership                : 用户×租户 归属状态机（INVITED/ACTIVE/SUSPENDED/REMOVED），
 *                                作为跨租户身份与生命周期的单一事实来源（P2）。
 *
 * 迁移对 MySQL / SQLite 均适用（使用 TypeORM schema builder，避免手写方言 SQL）。
 * 历史用户在 membership 建表前已存在，末尾补 ACTIVE 关系避免登录被拦截（向后兼容）。
 */
export class FeatureOrgRbacMembership20261012000001 implements MigrationInterface {
  name = 'FeatureOrgRbacMembership20261012000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) organizations.ancestors
    await queryRunner.addColumn(
      'organizations',
      new TableColumn({
        name: 'ancestors',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );

    // 2) role.inherits_from（自关联，引用平台模板角色）
    await queryRunner.addColumn(
      'role',
      new TableColumn({
        name: 'inherits_from',
        type: 'bigint',
        isNullable: true,
      }),
    );

    // 3) membership 表
    await queryRunner.createTable(
      new Table({
        name: 'membership',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'tenant_id', type: 'bigint', isNullable: false, default: 0 },
          { name: 'user_id', type: 'bigint', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'ACTIVE'",
            isNullable: false,
          },
          { name: 'source', type: 'varchar', length: '64', isNullable: true },
          { name: 'created_at', type: 'datetime', isNullable: true },
          { name: 'updated_at', type: 'datetime', isNullable: true },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
        indices: [
          { name: 'idx_membership_tenant', columnNames: ['tenant_id'] },
          { name: 'idx_membership_user', columnNames: ['user_id'] },
          {
            name: 'uq_membership_tenant_user',
            columnNames: ['tenant_id', 'user_id'],
            isUnique: true,
          },
        ],
      }),
      true,
    );

    // 历史用户补 ACTIVE 成员关系（幂等）
    await queryRunner.query(
      `INSERT INTO membership (tenant_id, user_id, status, created_at, updated_at)
       SELECT u.tenant_id, u.id, 'ACTIVE', u.created_at, u.updated_at
       FROM sys_user u
       WHERE NOT EXISTS (
         SELECT 1 FROM membership m
         WHERE m.tenant_id = u.tenant_id AND m.user_id = u.id
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('membership', true);
    await queryRunner.dropColumn('role', 'inherits_from');
    await queryRunner.dropColumn('organizations', 'ancestors');
  }
}
