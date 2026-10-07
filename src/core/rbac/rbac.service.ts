import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

/** 模块权限码目录（与文档 §11.4 权限矩阵对应，可按需扩展） */
const MODULES = [
  'course',
  'class-group',
  'lesson',
  'student',
  'lead',
  'order',
  'hour',
  'homework',
  'growth',
  'approval',
  'coupon',
  'complaint',
  'member',
  'org',
  'report',
];
const ACTIONS = ['view', 'create', 'update', 'delete', 'export'];

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  /** 为某租户初始化默认权限、角色、超级管理员（幂等） */
  async seedTenant(tenantId: number, adminPassword = 'admin123456') {
    // 1) 权限点
    const permMap = new Map<string, Permission>();
    for (const m of MODULES) {
      for (const a of ACTIONS) {
        const code = `${m}:${a}`;
        let p = await this.permRepo.findOne({ where: { tenantId, code } });
        if (!p) {
          p = this.permRepo.create({
            tenantId,
            code,
            name: `${m} ${a}`,
            group: m,
          });
          p = await this.permRepo.save(p);
        }
        permMap.set(code, p);
      }
    }
    const allPerms = [...permMap.values()];

    // 2) 角色
    const ensureRole = async (
      code: string,
      name: string,
      perms: Permission[],
      dataScope: 'all' | 'org' | 'self' = 'org',
    ) => {
      let role = await this.roleRepo.findOne({
        where: { tenantId, code },
        relations: ['permissions'],
      });
      if (!role) {
        role = this.roleRepo.create({
          tenantId,
          code,
          name,
          dataScope,
          permissions: perms,
        });
        role = await this.roleRepo.save(role);
      }
      return role;
    };

    const superAdmin = await ensureRole('super_admin', '超级管理员', allPerms, 'all');
    await ensureRole(
      'teacher',
      '授课老师',
      MODULES.flatMap((m) =>
        [permMap.get(`${m}:view`), permMap.get(`${m}:create`), permMap.get(`${m}:update`)].filter(
          Boolean,
        ) as Permission[],
      ),
      'self',
    );
    await ensureRole(
      'finance',
      '财务',
      ['order:view', 'order:create', 'order:update', 'report:view', 'hour:view'].map(
        (c) => permMap.get(c),
      ).filter(Boolean) as Permission[],
      'org',
    );

    // 3) 超级管理员账号
    const username = 'admin';
    let admin = await this.userRepo.findOne({
      where: { tenantId, username },
      relations: ['roles'],
    });
    if (!admin) {
      admin = this.userRepo.create({
        tenantId,
        username,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: '超级管理员',
        status: 1,
        roles: [superAdmin],
      });
      admin = await this.userRepo.save(admin);
      this.logger.log(`租户 ${tenantId} 初始化超级管理员: ${username} / ${adminPassword}`);
    }
    return admin;
  }
}
