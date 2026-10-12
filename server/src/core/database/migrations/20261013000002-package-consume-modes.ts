import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * 套餐形态与消耗模式迁移（文档 §2/§3）：
 *  - 商品定义层：course_package 增 sell_type / consume_mode / scope_type / code / class_group_id / list_price
 *  - 组合套餐子项 package_item（hours 区分"组合包"与"通用包"）
 *  - 阶梯规格 package_tier、差异化定价 package_price_rule
 *  - 账户层：hour_account 增 unit_value / is_granted / grant_type / status / start_at / order_item_id
 *  - 一课一消：hour_consumption 增 confirm_status / confirm_at / attendance_id
 *  - 时间型权益 entitlement（BY_TIME）、期课报名 enrollment（BY_PERIOD）
 *  - attendance 唯一约束(tenant_id, lesson_id, student_id)：杜绝重复点名重复消课
 * 幂等：按 information_schema 判重，重复执行安全。
 */
export class PackageConsumeModes20261013000002 implements MigrationInterface {
  name = 'PackageConsumeModes20261013000002';

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

  private async hasIndex(qr: QueryRunner, table: string, indexName: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
      [table, indexName],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  private async ensureIndex(
    qr: QueryRunner,
    table: string,
    indexName: string,
    columnNames: string[],
    unique = false,
  ): Promise<void> {
    if (await this.hasIndex(qr, table, indexName)) return;
    await qr.createIndex(table, new TableIndex({ name: indexName, columnNames, isUnique: unique }));
  }

  private async createTable(qr: QueryRunner, table: string, body: string): Promise<void> {
    await qr.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (${body}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

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
    // ---------- 商品定义层 ----------
    await this.addColumn(queryRunner, 'course_package', 'code', '`code` varchar(64) NULL');
    await this.addColumn(
      queryRunner, 'course_package', 'sell_type',
      "`sell_type` varchar(16) NOT NULL DEFAULT 'HOUR_PACK' COMMENT 'SINGLE/HOUR_PACK/COMBO/PERIOD_COURSE/TIME_CARD/DEPOSIT'",
    );
    await this.addColumn(
      queryRunner, 'course_package', 'consume_mode',
      "`consume_mode` varchar(16) NOT NULL DEFAULT 'BY_HOUR' COMMENT 'BY_HOUR/BY_TIME/BY_PERIOD'",
    );
    await this.addColumn(
      queryRunner, 'course_package', 'scope_type',
      "`scope_type` varchar(16) NOT NULL DEFAULT 'SPECIFIED_COURSE' COMMENT 'ALL_COURSE/SPECIFIED_COURSE'",
    );
    await this.addColumn(queryRunner, 'course_package', 'class_group_id', '`class_group_id` bigint NULL');
    await this.addColumn(queryRunner, 'course_package', 'list_price', '`list_price` decimal(10,2) NOT NULL DEFAULT 0');

    // ---------- 组合套餐子项 / 阶梯规格 / 差异定价 ----------
    await this.createTable(
      queryRunner,
      'package_item',
      `${this.baseCols()},
      \`package_id\` bigint NOT NULL,
      \`course_id\` bigint NOT NULL,
      \`hours\` int NULL COMMENT '子项固定课时(空=通用包仅圈范围)',
      \`seq\` int NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_package_item\` (\`tenant_id\`,\`package_id\`,\`course_id\`),
      KEY \`idx_package_item_package\` (\`tenant_id\`,\`package_id\`)`,
    );
    await this.createTable(
      queryRunner,
      'package_tier',
      `${this.baseCols()},
      \`package_id\` bigint NOT NULL,
      \`hours\` int NOT NULL,
      \`price\` decimal(10,2) NOT NULL,
      \`sort\` int NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`),
      KEY \`idx_package_tier_package\` (\`tenant_id\`,\`package_id\`)`,
    );
    await this.createTable(
      queryRunner,
      'package_price_rule',
      `${this.baseCols()},
      \`package_id\` bigint NOT NULL,
      \`dimension\` varchar(16) NOT NULL COMMENT 'CAMPUS/TEACHER_LEVEL/CLASS_TYPE',
      \`dim_value\` varchar(64) NOT NULL,
      \`price\` decimal(10,2) NOT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_package_price_rule\` (\`tenant_id\`,\`package_id\`)`,
    );

    // ---------- 课时账户 ----------
    await this.addColumn(queryRunner, 'hour_account', 'unit_value', '`unit_value` decimal(12,2) NOT NULL DEFAULT 0');
    await this.addColumn(queryRunner, 'hour_account', 'is_granted', '`is_granted` tinyint NOT NULL DEFAULT 0 COMMENT \'1=赠课\'');
    await this.addColumn(queryRunner, 'hour_account', 'grant_type', "`grant_type` varchar(16) NOT NULL DEFAULT 'PAID'");
    await this.addColumn(queryRunner, 'hour_account', 'status', "`status` varchar(16) NOT NULL DEFAULT 'ACTIVE'");
    await this.addColumn(queryRunner, 'hour_account', 'start_at', '`start_at` datetime NULL');
    await this.addColumn(queryRunner, 'hour_account', 'order_item_id', '`order_item_id` bigint NULL');
    await this.ensureIndex(queryRunner, 'hour_account', 'idx_hour_account_student_status', [
      'tenant_id', 'student_id', 'status',
    ]);

    // ---------- 一课一消 ----------
    await this.addColumn(queryRunner, 'hour_consumption', 'confirm_status', '`confirm_status` varchar(16) NULL');
    await this.addColumn(queryRunner, 'hour_consumption', 'confirm_at', '`confirm_at` datetime NULL');
    await this.addColumn(queryRunner, 'hour_consumption', 'attendance_id', '`attendance_id` bigint NULL');
    await this.ensureIndex(queryRunner, 'hour_consumption', 'idx_hour_consumption_lesson', ['tenant_id', 'lesson_id']);

    // ---------- 时间型权益 / 期课报名 ----------
    await this.createTable(
      queryRunner,
      'entitlement',
      `${this.baseCols()},
      \`student_id\` bigint NOT NULL,
      \`package_id\` bigint NULL,
      \`course_id\` bigint NULL,
      \`start_at\` datetime NOT NULL,
      \`expire_at\` datetime NOT NULL,
      \`status\` varchar(16) NOT NULL DEFAULT 'ACTIVE',
      \`ref_order_id\` bigint NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_entitlement_student\` (\`tenant_id\`,\`student_id\`),
      KEY \`idx_entitlement_status\` (\`tenant_id\`,\`student_id\`,\`status\`)`,
    );
    await this.createTable(
      queryRunner,
      'enrollment',
      `${this.baseCols()},
      \`student_id\` bigint NOT NULL,
      \`class_group_id\` bigint NULL,
      \`course_id\` bigint NULL,
      \`package_id\` bigint NULL,
      \`joined_at\` datetime NOT NULL,
      \`join_type\` varchar(16) NOT NULL DEFAULT 'FULL',
      \`discount_hours\` int NOT NULL DEFAULT 0,
      \`discount_amount\` decimal(12,2) NOT NULL DEFAULT 0,
      \`total_lessons\` int NOT NULL DEFAULT 0,
      \`attended_lessons\` int NOT NULL DEFAULT 0,
      \`status\` varchar(16) NOT NULL DEFAULT 'ACTIVE',
      \`ref_order_id\` bigint NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_enrollment_student\` (\`tenant_id\`,\`student_id\`),
      KEY \`idx_enrollment_class\` (\`tenant_id\`,\`class_group_id\`)`,
    );

    // ---------- 考勤：唯一约束（先清重复，保留最小 id） ----------
    await this.addColumn(queryRunner, 'attendance', 'consume_mode', '`consume_mode` varchar(16) NULL');
    await queryRunner.query(`
      DELETE a FROM \`attendance\` a
      JOIN (
        SELECT tenant_id, lesson_id, student_id, MIN(id) AS keep_id
        FROM \`attendance\` GROUP BY tenant_id, lesson_id, student_id
      ) k
      ON a.tenant_id = k.tenant_id AND a.lesson_id = k.lesson_id AND a.student_id = k.student_id
      WHERE a.id > k.keep_id
    `);
    await this.ensureIndex(
      queryRunner, 'attendance', 'uk_attendance_lesson_student',
      ['tenant_id', 'lesson_id', 'student_id'], true,
    );
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
