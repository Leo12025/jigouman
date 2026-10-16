import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 审批节点支持会签(AND)/或签(OR)：
 *  - approval_node.mode          : 节点审批模式，默认 'OR'；
 *  - approval_node.acted_user_ids : 本节点已审批用户 ID 集合(JSON)，会签累计使用。
 *
 * 对 MySQL / SQLite 均适用（TypeORM schema builder，避免手写方言 SQL）。
 */
export class ApprovalNodeCountersign20261013000001 implements MigrationInterface {
  name = 'ApprovalNodeCountersign20261013000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'approval_node',
      new TableColumn({
        name: 'mode',
        type: 'varchar',
        length: '8',
        default: "'OR'",
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'approval_node',
      new TableColumn({
        name: 'acted_user_ids',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('approval_node', 'acted_user_ids');
    await queryRunner.dropColumn('approval_node', 'mode');
  }
}
