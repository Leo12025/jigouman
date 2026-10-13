import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 套餐适用人群迁移（文档 §2.4 #17 老生续费专享包）：
 *  - course_package 增 audience：ALL 全部 / NEW 仅新签 / RETURNING 仅老生续费
 *  - package_price_rule 的 dimension 扩展 AUDIENCE（varchar，无需变更列定义）
 * 老生判定规则：学员存在有效订单（PAID/COMPLETED，即非退费非取消）即为老生。
 * 幂等：按 information_schema 判重。
 */
export class PackageAudience20261013000003 implements MigrationInterface {
  name = 'PackageAudience20261013000003';

  private async hasColumn(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
      [table, column],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'course_package', 'audience'))) {
      await queryRunner.query(
        "ALTER TABLE `course_package` ADD COLUMN `audience` varchar(16) NOT NULL DEFAULT 'ALL' COMMENT 'ALL/NEW 仅新签/RETURNING 仅老生续费'",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner, 'course_package', 'audience')) {
      await queryRunner.query('ALTER TABLE `course_package` DROP COLUMN `audience`');
    }
  }
}
