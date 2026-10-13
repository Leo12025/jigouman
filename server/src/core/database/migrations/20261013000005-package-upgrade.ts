import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 套餐升级补差价迁移（文档 §2.4 #18）：30 课时包升 60 课时包，补差价。
 *  - 新增 package_upgrade 升级单：记录原账户/目标套餐/折价课时与金额/应付差价/审批
 *  - orders.order_type 扩展 UPGRADE（varchar，无需变更列定义）
 * 口径：原剩余付费课时按原账户单价折价抵扣新套餐价款，折价后原账户清零并置 CLOSED；
 * 赠课是否参与折价由 upgrade_include_gift_hours 控制（默认不参与）。
 * 幂等：CREATE TABLE IF NOT EXISTS。
 */
export class PackageUpgrade20261013000005 implements MigrationInterface {
  name = 'PackageUpgrade20261013000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`package_upgrade\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`tenant_id\` bigint NOT NULL DEFAULT 0,
        \`org_id\` bigint NULL,
        \`student_id\` bigint NOT NULL,
        \`from_account_id\` bigint NOT NULL COMMENT '原课时账户',
        \`from_package_id\` bigint NULL COMMENT '原套餐',
        \`to_package_id\` bigint NOT NULL COMMENT '目标套餐',
        \`to_tier_id\` bigint NULL COMMENT '目标阶梯档位',
        \`carry_hours\` int NOT NULL DEFAULT 0 COMMENT '折价付费课时',
        \`gift_hours\` int NOT NULL DEFAULT 0 COMMENT '折价赠课课时',
        \`include_gift\` tinyint NOT NULL DEFAULT 0 COMMENT '赠课是否参与折价',
        \`unit_value\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '原账户课时单价',
        \`deduct_amount\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '折价抵扣金额',
        \`target_hours\` int NOT NULL DEFAULT 0 COMMENT '目标套餐课时',
        \`target_amount\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '目标套餐价',
        \`payable_amount\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '应付差价',
        \`order_id\` bigint NULL COMMENT '差价订单',
        \`approval_instance_id\` bigint NULL COMMENT '审批实例',
        \`status\` varchar(16) NOT NULL DEFAULT 'PENDING',
        \`executed_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_package_upgrade_student\` (\`tenant_id\`,\`student_id\`),
        KEY \`idx_package_upgrade_status\` (\`tenant_id\`,\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('package_upgrade', true).catch(() => undefined);
  }
}
