import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';
import { addColumnIfMissing, baseColumns, createTableIfMissing, ensureIndex, moneyColumn } from '../migration-utils';

/**
 * 团购/拼团增强迁移（对照竞品「商家岛」团购拆解）：
 *  - 交易闭环：orders 增 group_buy_team_id；group_buy_members 增 order_id / pay_price
 *  - 缺陷修复：group_buy_teams 增 expire_at / redeemed_at / redeemed_by
 *  - 阶梯团：新增 group_buy_tiers；活动增 leader_price / team_valid_hours / auto_fill / join_rule
 *  - 拼团×分销：活动增 commission_rate1 / commission_rate2；成员增 distributor_id
 *  - P2：group_buy_showoffs 晒单、group_buy_squads 战队、activity_events 过程埋点、
 *        marketing_materials 营销物料
 * 幂等，跨驱动（MySQL 与 sqlite 均可执行）。
 */
export class GroupBuyEnhance20261013000007 implements MigrationInterface {
  name = 'GroupBuyEnhance20261013000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- 交易闭环 ----------
    await addColumnIfMissing(queryRunner, 'orders',
      new TableColumn({ name: 'group_buy_team_id', type: 'bigint', isNullable: true, comment: '关联拼团实例' }));
    await addColumnIfMissing(queryRunner, 'group_buy_members',
      new TableColumn({ name: 'order_id', type: 'bigint', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_members',
      new TableColumn({ name: 'distributor_id', type: 'bigint', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_members',
      new TableColumn({ name: 'is_leader', type: 'tinyint', default: '0' }));
    await addColumnIfMissing(queryRunner, 'group_buy_members',
      new TableColumn({ name: 'pay_price', type: 'decimal', precision: 10, scale: 2, isNullable: true }));

    // ---------- 活动配置 ----------
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'package_id', type: 'bigint', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'hours', type: 'int', default: '0', comment: '成团发放课时' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'leader_price', type: 'decimal', precision: 10, scale: 2, isNullable: true, comment: '团长优惠价' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'team_valid_hours', type: 'int', default: '24', comment: '团有效期(小时)' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'auto_fill', type: 'tinyint', default: '0', comment: '模拟成团' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'join_rule', type: 'varchar', length: '16', default: "'ALL'" }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'commission_rate1', type: 'decimal', precision: 5, scale: 4, default: '0' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'commission_rate2', type: 'decimal', precision: 5, scale: 4, default: '0' }));
    await addColumnIfMissing(queryRunner, 'group_buy_activities',
      new TableColumn({ name: 'owner_id', type: 'bigint', isNullable: true }));

    // ---------- 团：有效期 / 核销落库 ----------
    await addColumnIfMissing(queryRunner, 'group_buy_teams',
      new TableColumn({ name: 'expire_at', type: 'datetime', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_teams',
      new TableColumn({ name: 'redeemed_at', type: 'datetime', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_teams',
      new TableColumn({ name: 'redeemed_by', type: 'bigint', isNullable: true }));
    await addColumnIfMissing(queryRunner, 'group_buy_teams',
      new TableColumn({ name: 'auto_filled', type: 'tinyint', default: '0' }));
    await ensureIndex(queryRunner, 'group_buy_teams', 'idx_gb_team_activity_status',
      ['tenant_id', 'activity_id', 'status']);

    // ---------- 阶梯团 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'group_buy_tiers',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'activity_id', type: 'bigint' }),
        new TableColumn({ name: 'min_size', type: 'int' }),
        new TableColumn({ name: 'price', type: 'decimal', precision: 10, scale: 2 }),
        new TableColumn({ name: 'sort', type: 'int', default: '0' }),
      ],
    }));
    await ensureIndex(queryRunner, 'group_buy_tiers', 'idx_gb_tier_activity', ['tenant_id', 'activity_id']);

    // ---------- 晒单 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'group_buy_showoffs',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'activity_id', type: 'bigint' }),
        new TableColumn({ name: 'team_id', type: 'bigint' }),
        new TableColumn({ name: 'student_id', type: 'bigint' }),
        new TableColumn({ name: 'images', type: 'text', isNullable: true }),
        new TableColumn({ name: 'content', type: 'text', isNullable: true }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'APPROVED'" }),
      ],
    }));
    await ensureIndex(queryRunner, 'group_buy_showoffs', 'idx_gb_showoff_activity', ['tenant_id', 'activity_id']);
    await ensureIndex(queryRunner, 'group_buy_showoffs', 'idx_gb_showoff_team', ['tenant_id', 'team_id']);

    // ---------- 战队 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'group_buy_squads',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'activity_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'name', type: 'varchar', length: '64' }),
        new TableColumn({ name: 'staff_ids', type: 'text', isNullable: true }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }),
      ],
    }));
    await ensureIndex(queryRunner, 'group_buy_squads', 'idx_gb_squad_activity', ['tenant_id', 'activity_id']);

    // ---------- 过程埋点 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'activity_events',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'activity_id', type: 'bigint' }),
        new TableColumn({ name: 'team_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'type', type: 'varchar', length: '16' }),
        new TableColumn({ name: 'student_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'visitor_id', type: 'varchar', length: '64', isNullable: true }),
        new TableColumn({ name: 'staff_id', type: 'bigint', isNullable: true }),
      ],
    }));
    await ensureIndex(queryRunner, 'activity_events', 'idx_activity_event_activity', ['tenant_id', 'activity_id']);
    await ensureIndex(queryRunner, 'activity_events', 'idx_activity_event_type', ['tenant_id', 'activity_id', 'type']);

    // ---------- 营销物料 ----------
    await createTableIfMissing(queryRunner, new Table({
      name: 'marketing_materials',
      columns: [
        ...baseColumns(),
        new TableColumn({ name: 'org_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'name', type: 'varchar', length: '128' }),
        new TableColumn({ name: 'type', type: 'varchar', length: '16', default: "'POSTER'" }),
        new TableColumn({ name: 'scene', type: 'varchar', length: '64', isNullable: true }),
        new TableColumn({ name: 'activity_id', type: 'bigint', isNullable: true }),
        new TableColumn({ name: 'content', type: 'text', isNullable: true }),
        new TableColumn({ name: 'cover_url', type: 'varchar', length: '512', isNullable: true }),
        new TableColumn({ name: 'printable', type: 'tinyint', default: '0' }),
        new TableColumn({ name: 'status', type: 'varchar', length: '16', default: "'ACTIVE'" }),
      ],
    }));
    await ensureIndex(queryRunner, 'marketing_materials', 'idx_marketing_material_status', ['tenant_id', 'status']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('marketing_materials', true).catch(() => undefined);
    await queryRunner.dropTable('activity_events', true).catch(() => undefined);
    await queryRunner.dropTable('group_buy_squads', true).catch(() => undefined);
    await queryRunner.dropTable('group_buy_showoffs', true).catch(() => undefined);
    await queryRunner.dropTable('group_buy_tiers', true).catch(() => undefined);
  }
}
