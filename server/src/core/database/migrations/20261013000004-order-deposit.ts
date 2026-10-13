import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { addColumnIfMissing } from '../migration-utils';

/**
 * 定金/订金迁移（文档 §2.4 #15）：集训营预约定金 200 抵 800。
 *  - orders 增 order_type：NORMAL 普通 / DEPOSIT 定金单（支付后不发课时）
 *  - orders 增 deposit_deduct_amount：转正式订单时的抵扣额（付 200 抵 800 → 800）
 *  - orders 增 used_by_order_id：定金被哪张正式订单抵扣（防重复使用）
 *  - orders 增 deposit_order_id：正式订单引用的定金单
 *  - order_item 的 item_type 扩展 DEPOSIT（varchar，无需变更列定义）
 * 幂等。
 */
export class OrderDeposit20261013000004 implements MigrationInterface {
  name = 'OrderDeposit20261013000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner, 'orders',
      new TableColumn({
        name: 'order_type', type: 'varchar', length: '16', default: "'NORMAL'",
        comment: 'NORMAL 普通/DEPOSIT 定金',
      }),
    );
    await addColumnIfMissing(
      queryRunner, 'orders',
      new TableColumn({
        name: 'deposit_deduct_amount', type: 'decimal', precision: 12, scale: 2, default: '0',
        comment: '定金转正式订单可抵扣金额',
      }),
    );
    await addColumnIfMissing(
      queryRunner, 'orders',
      new TableColumn({
        name: 'used_by_order_id', type: 'bigint', isNullable: true,
        comment: '定金被抵扣的正式订单(防重复使用)',
      }),
    );
    await addColumnIfMissing(
      queryRunner, 'orders',
      new TableColumn({
        name: 'deposit_order_id', type: 'bigint', isNullable: true,
        comment: '来源定金单',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['order_type', 'deposit_deduct_amount', 'used_by_order_id', 'deposit_order_id']) {
      if (await queryRunner.hasColumn('orders', col)) {
        await queryRunner.dropColumn('orders', col);
      }
    }
  }
}
