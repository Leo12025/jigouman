import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { addColumnIfMissing } from '../migration-utils';

/**
 * 套餐适用人群迁移（文档 §2.4 #17 老生续费专享包）：
 *  - course_package 增 audience：ALL 全部 / NEW 仅新签 / RETURNING 仅老生续费
 *  - package_price_rule 的 dimension 扩展 AUDIENCE（varchar，无需变更列定义）
 * 老生判定规则：学员存在有效订单（PAID/COMPLETED，即非退费非取消）即为老生。
 * 幂等。
 */
export class PackageAudience20261013000003 implements MigrationInterface {
  name = 'PackageAudience20261013000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'course_package',
      new TableColumn({
        name: 'audience', type: 'varchar', length: '16', default: "'ALL'",
        comment: 'ALL/NEW 仅新签/RETURNING 仅老生续费',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('course_package', 'audience')) {
      await queryRunner.dropColumn('course_package', 'audience');
    }
  }
}
