import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { addColumnIfMissing, baseColumns, createTableIfMissing, ensureIndex } from '../migration-utils';

/**
 * 套餐形态与消耗模式迁移（文档 §2/§3）：
 *  - 商品定义层：course_package 增 sell_type / consume_mode / scope_type / code / class_group_id / list_price
 *  - 组合套餐子项 package_item（hours 区分"组合包"与"通用包"）
 *  - 阶梯规格 package_tier、差异化定价 package_price_rule
 *  - 账户层：hour_account 增 unit_value / is_granted / grant_type / status / start_at / order_item_id
 *  - 一课一消：hour_consumption 增 confirm_status / confirm_at / attendance_id
 *  - 时间型权益 entitlement（BY_TIME）、期课报名 enrollment（BY_PERIOD）
 *  - attendance 唯一约束(tenant_id, lesson_id, student_id)：杜绝重复点名重复消课
 * 幂等：列/表/索引均按存在性判重；跨驱动（MySQL 与 sqlite 均可执行）。
 */
export class PackageConsumeModes20261013000002 implements MigrationInterface {
  name = 'PackageConsumeModes20261013000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- 商品定义层 ----------
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({ name: 'code', type: 'varchar', length: '64', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({
        name: 'sell_type', type: 'varchar', length: '16', default: "'HOUR_PACK'",
        comment: 'SINGLE/HOUR_PACK/COMBO/PERIOD_COURSE/TIME_CARD/DEPOSIT',
      }));
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({
        name: 'consume_mode', type: 'varchar', length: '16', default: "'BY_HOUR'",
        comment: 'BY_HOUR/BY_TIME/BY_PERIOD',
      }));
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({
        name: 'scope_type', type: 'varchar', length: '16', default: "'SPECIFIED_COURSE'",
        comment: 'ALL_COURSE/SPECIFIED_COURSE',
      }));
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({ name: 'class_group_id', type: 'bigint', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'course_package',
      new TableColumn({ name: 'list_price', type: 'decimal', precision: 10, scale: 2, default: '0' }));

    // ---------- 组合套餐子项 / 阶梯规格 / 差异定价 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'package_item',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'package_id', type: 'bigint' }),
        new TableColumn({ name: 'course_id', type: 'bigint' }),
        new TableColumn({
          name: 'hours', type: 'int', isNullable: true,
          comment: '子项固定课时(空=通用包仅圈范围)',
        }),
        new TableColumn({ name: 'seq', type: 'int', default: '0' }),
      ],
    }));
    await ensureIndex(queryRunner, 'package_item', 'idx_package_item_package', ['tenant_id', 'package_id']);
    await ensureIndex(queryRunner, 'package_item', 'uk_package_item', ['tenant_id', 'package_id', 'course_id'], true);

    await createTableIfMissing(queryRunner, new Table({
      name: 'package_tier',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'package_id', type: 'bigint' }),
        new TableColumn({ name: 'hours', type: 'int' }),
        new TableColumn({ name: 'price', type: 'decimal', precision: 10, scale: 2 }),
        new TableColumn({ name: 'sort', type: 'int', default: '0' }),
      ],
    }));
    await ensureIndex(queryRunner, 'package_tier', 'idx_package_tier_package', ['tenant_id', 'package_id']);

    await createTableIfMissing(queryRunner, new Table({
      name: 'package_price_rule',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'package_id', type: 'bigint' }),
        new TableColumn({
          name: 'dimension', type: 'varchar', length: '16',
          comment: 'CAMPUS/TEACHER_LEVEL/CLASS_TYPE/AUDIENCE',
        }),
        new TableColumn({ name: 'dim_value', type: 'varchar', length: '64' }),
        new TableColumn({ name: 'price', type: 'decimal', precision: 10, scale: 2 }),
      ],
    }));
    await ensureIndex(queryRunner, 'package_price_rule', 'idx_package_price_rule', ['tenant_id', 'package_id']);

    // ---------- 课时账户 ----------
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({ name: 'unit_value', type: 'decimal', precision: 12, scale: 2, default: '0' }));
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({
        name: 'is_granted', type: 'tinyint', default: '0',
        comment: '1=赠课(独立成户,优先消耗,退费不计入)',
      }));
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({ name: 'grant_type', type: 'varchar', length: '16', default: "'PAID'" }));
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }));
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({ name: 'start_at', type: 'datetime', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'hour_account',
      new TableColumn({ name: 'order_item_id', type: 'bigint', isNullable: true }));
    await ensureIndex(queryRunner, 'hour_account', 'idx_hour_account_student_status',
      ['tenant_id', 'student_id', 'status']);

    // ---------- 一课一消 ----------
    await addColumnIfMissing(queryRunner, 'hour_consumption',
      new TableColumn({ name: 'confirm_status', type: 'varchar', length: '16', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'hour_consumption',
      new TableColumn({ name: 'confirm_at', type: 'datetime', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'hour_consumption',
      new TableColumn({ name: 'attendance_id', type: 'bigint', isNullable: true }));
    await ensureIndex(queryRunner, 'hour_consumption', 'idx_hour_consumption_lesson',
      ['tenant_id', 'lesson_id']);

    // ---------- 时间型权益 / 期课报名 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'entitlement',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({ name: 'package_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'course_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'start_at', type: 'datetime' }),
        new TableColumn({ name: 'expire_at', type: 'datetime' }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }),
        new TableColumn({ name: 'ref_order_id', type: 'bigint', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'entitlement', 'idx_entitlement_student', ['tenant_id', 'student_id']);
    await ensureIndex(queryRunner, 'entitlement', 'idx_entitlement_status', ['tenant_id', 'student_id', 'status']);

    await createTableIfMissing(queryRunner, new Table({
      name: 'enrollment',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({ name: 'class_group_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'course_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'package_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'joined_at', type: 'datetime' }),
        new TableColumn({ name: 'join_type', type: 'varchar', length: '16', default: "'FULL'" }),
        new TableColumn({ name: 'discount_hours', type: 'int', default: '0' }),
        new TableColumn({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: '0' }),
        new TableColumn({ name: 'total_lessons', type: 'int', default: '0' }),
        new TableColumn({ name: 'attended_lessons', type: 'int', default: '0' }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }),
        new TableColumn({ name: 'ref_order_id', type: 'bigint', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'enrollment', 'idx_enrollment_student', ['tenant_id', 'student_id']);
    await ensureIndex(queryRunner, 'enrollment', 'idx_enrollment_class', ['tenant_id', 'class_group_id']);

    // ---------- 考勤：清重复后加唯一约束 ----------
    await addColumnIfMissing(queryRunner, 'attendance',
      new TableColumn({ name: 'consume_mode', type: 'varchar', length: '16', isNullable: true }));

    // 先清理历史重复行（同一课次同一学员只保留最小 id），再建唯一索引
    await queryRunner.query(`
      DELETE FROM attendance WHERE id NOT IN (
        SELECT keep_id FROM (
          SELECT MIN(id) AS keep_id FROM attendance GROUP BY tenant_id, lesson_id, student_id
        ) k
      )
    `);
    await ensureIndex(queryRunner, 'attendance', 'uk_attendance_lesson_student',
      ['tenant_id', 'lesson_id', 'student_id'], true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('attendance', 'uk_attendance_lesson_student').catch(() => undefined);
    await queryRunner.dropTable('enrollment', true).catch(() => undefined);
    await queryRunner.dropTable('entitlement', true).catch(() => undefined);
    await queryRunner.dropTable('package_price_rule', true).catch(() => undefined);
    await queryRunner.dropTable('package_tier', true).catch(() => undefined);
    await queryRunner.dropTable('package_item', true).catch(() => undefined);
  }
}
