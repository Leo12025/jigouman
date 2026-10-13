import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { baseColumns, createTableIfMissing, ensureIndex, moneyColumn } from '../migration-utils';

/**
 * 储值卡迁移（文档 §2.4 #14）：储值 / 预存赠送。
 *  - stored_value_account：储值账户（资金账户，余额为金额；gift_balance 为其中赠送部分）
 *  - stored_value_ledger：储值流水（充值/赠送/消费/退回/过期），资金账户必须留痕
 * 合规：储值属"以充值形式变相收取"，同样受 5000 元上限约束（服务层校验，二次确认可继续）。
 * 幂等，跨驱动。
 */
export class StoredValue20261013000006 implements MigrationInterface {
  name = 'StoredValue20261013000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfMissing(queryRunner, new Table({
      name: 'stored_value_account',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({
          name: 'balance', type: 'decimal', precision: 12, scale: 2, default: '0',
          comment: '可用余额(含赠送)',
        }),
        new TableColumn({
          name: 'gift_balance', type: 'decimal', precision: 12, scale: 2, default: '0',
          comment: '其中赠送部分(不退不提现)',
        }),
        new TableColumn({ name: 'total_recharged', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'total_gift', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'total_used', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }),
        new TableColumn({ name: 'expire_at', type: 'datetime', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'stored_value_account', 'idx_sv_account_student', ['tenant_id', 'student_id']);

    await createTableIfMissing(queryRunner, new Table({
      name: 'stored_value_ledger',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'account_id', type: 'bigint' }),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({
          name: 'type', type: 'varchar', length: '16',
          comment: 'RECHARGE/GIFT/CONSUME/REFUND/EXPIRE',
        }),
        new TableColumn({ name: 'amount', type: 'decimal', precision: 12, scale: 2, comment: '正入账/负出账' }),
        moneyColumn('gift_amount', 12, 2),
        new TableColumn({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'ref_order_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'operator_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'remark', type: 'varchar', length: '255', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'stored_value_ledger', 'idx_sv_ledger_account', ['tenant_id', 'account_id']);
    await ensureIndex(queryRunner, 'stored_value_ledger', 'idx_sv_ledger_student', ['tenant_id', 'student_id']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('stored_value_ledger', true).catch(() => undefined);
    await queryRunner.dropTable('stored_value_account', true).catch(() => undefined);
  }
}
