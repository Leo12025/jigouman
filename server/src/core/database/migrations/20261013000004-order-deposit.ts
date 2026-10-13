import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 定金/订金迁移（文档 §2.4 #15）：集训营预约定金 200 抵 800。
 *  - orders 增 order_type：NORMAL 普通 / DEPOSIT 定金单（支付后不发课时）
 *  - orders 增 deposit_deduct_amount：转正式订单时的抵扣额（付 200 抵 800 → 800）
 *  - orders 增 used_by_order_id：定金被哪张正式订单抵扣（防重复使用）
 *  - orders 增 deposit_order_id：正式订单引用的定金单
 *  - order_item 的 item_type 扩展 DEPOSIT（varchar，无需变更列定义）
 * 幂等：按 information_schema 判重。
 */
export class OrderDeposit20261013000004 implements MigrationInterface {
  name = 'OrderDeposit20261013000004';

  private async hasColumn(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
      [table, column],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  private async addColumn(qr: QueryRunner, table: string, column: string, ddl: string): Promise<void> {
    if (await this.hasColumn(qr, table, column)) return;
    await qr.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumn(
      queryRunner, 'orders', 'order_type',
      "`order_type` varchar(16) NOT NULL DEFAULT 'NORMAL' COMMENT 'NORMAL 普通/DEPOSIT 定金单'",
    );
    await this.addColumn(
      queryRunner, 'orders', 'deposit_deduct_amount',
      '`deposit_deduct_amount` decimal(12,2) NOT NULL DEFAULT 0 COMMENT \'定金转正式订单可抵扣金额\'',
    );
    await this.addColumn(
      queryRunner, 'orders', 'used_by_order_id',
      '`used_by_order_id` bigint NULL COMMENT \'定金被抵扣的正式订单(防重复使用)\'',
    );
    await this.addColumn(
      queryRunner, 'orders', 'deposit_order_id',
      '`deposit_order_id` bigint NULL COMMENT \'来源定金单\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['order_type', 'deposit_deduct_amount', 'used_by_order_id', 'deposit_order_id']) {
      if (await this.hasColumn(queryRunner, 'orders', col)) {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`${col}\``);
      }
    }
  }
}
