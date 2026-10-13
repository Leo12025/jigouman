import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 储值卡迁移（文档 §2.4 #14）：储值 / 预存赠送。
 *  - stored_value_account：储值账户（资金账户，余额为金额；gift_balance 为其中赠送部分）
 *  - stored_value_ledger：储值流水（充值/赠送/消费/退回/过期），资金账户必须留痕
 * 合规：储值属"以充值形式变相收取"，同样受 5000 元上限约束（服务层校验，二次确认可继续）。
 * 幂等：CREATE TABLE IF NOT EXISTS。
 */
export class StoredValue20261013000006 implements MigrationInterface {
  name = 'StoredValue20261013000006';

  private baseCols(): string {
    return `
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`tenant_id\` bigint NOT NULL DEFAULT 0,
      \`org_id\` bigint NULL,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`deleted_at\` datetime(6) NULL`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stored_value_account\` (
        ${this.baseCols()},
        \`student_id\` bigint NOT NULL,
        \`balance\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '可用余额(含赠送)',
        \`gift_balance\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '其中赠送部分(不退不提现)',
        \`total_recharged\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '累计充值本金',
        \`total_gift\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '累计赠送',
        \`total_used\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '累计消费',
        \`status\` varchar(16) NOT NULL DEFAULT 'ACTIVE',
        \`expire_at\` datetime NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sv_account_student\` (\`tenant_id\`,\`student_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`stored_value_ledger\` (
        ${this.baseCols()},
        \`account_id\` bigint NOT NULL,
        \`student_id\` bigint NOT NULL,
        \`type\` varchar(16) NOT NULL COMMENT 'RECHARGE/GIFT/CONSUME/REFUND/EXPIRE',
        \`amount\` decimal(12,2) NOT NULL COMMENT '金额(正入账/负出账)',
        \`gift_amount\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '本次赠送金额',
        \`balance_after\` decimal(12,2) NOT NULL DEFAULT 0 COMMENT '变动后余额',
        \`ref_order_id\` bigint NULL,
        \`operator_id\` bigint NULL,
        \`remark\` varchar(255) NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sv_ledger_account\` (\`tenant_id\`,\`account_id\`),
        KEY \`idx_sv_ledger_student\` (\`tenant_id\`,\`student_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stored_value_ledger', true).catch(() => undefined);
    await queryRunner.dropTable('stored_value_account', true).catch(() => undefined);
  }
}
