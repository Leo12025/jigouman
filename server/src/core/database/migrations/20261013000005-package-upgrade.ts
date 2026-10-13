import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { baseColumns, createTableIfMissing, ensureIndex } from '../migration-utils';

/**
 * 套餐升级补差价迁移（文档 §2.4 #18）：30 课时包升 60 课时包，补差价。
 *  - 新增 package_upgrade 升级单：记录原账户/目标套餐/折价课时与金额/应付差价/审批
 *  - orders.order_type 扩展 UPGRADE（varchar，无需变更列定义）
 * 口径：原剩余付费课时按原账户单价折价抵扣新套餐价款，折价后原账户清零并置 CLOSED；
 * 赠课是否参与折价由 include_gift 控制（默认不参与）。
 * 幂等，跨驱动。
 */
export class PackageUpgrade20261013000005 implements MigrationInterface {
  name = 'PackageUpgrade20261013000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfMissing(queryRunner, new Table({
      name: 'package_upgrade',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({ name: 'from_account_id', type: 'bigint', comment: '原课时账户' }),
        new TableColumn({ name: 'from_package_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'to_package_id', type: 'bigint' }),
        new TableColumn({ name: 'to_tier_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'carry_hours', type: 'int', default: '0', comment: '折价付费课时' }),
        new TableColumn({ name: 'gift_hours', type: 'int', default: '0', comment: '折价赠课课时' }),
        new TableColumn({
          name: 'include_gift', type: 'tinyint', default: '0',
          comment: '赠课是否参与折价',
        }),
        new TableColumn({ name: 'unit_value', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'deduct_amount', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'target_hours', type: 'int', default: '0' }),
        new TableColumn({ name: 'target_amount', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'payable_amount', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'order_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'approval_instance_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'PENDING'" }),
        new TableColumn({ name: 'executed_at', type: 'datetime', isNullable: true }),
        new TableColumn({ name: 'remark', type: 'varchar', length: '255', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'package_upgrade', 'idx_package_upgrade_student', ['tenant_id', 'student_id']);
    await ensureIndex(queryRunner, 'package_upgrade', 'idx_package_upgrade_status', ['tenant_id', 'status']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('package_upgrade', true).catch(() => undefined);
  }
}
