import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Membership } from './membership.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/rbac.dto';

/** 模块权限码目录（与文档 §11.4 权限矩阵对应，可按需扩展） */
const MODULES = [
  'course',
  'class-group',
  'lesson',
  'student',
  'channel',
  'campaign',
  'lead',
  'order',
  'hour',
  'finance',
  'task',
  'notification',
  'homework',
  'review',
  'dashboard',
  'growth',
  'growth',
  'approval',
  'coupon',
  'complaint',
  'resource',
  'course-package',
  'courseware',
  'member',
  'org',
  'report',
  'user',
  'role',
  'permission',
  'staff',
  'venue',
  'contract',
  'survey',
  'alert',
  'inventory',
  'cost',
  'groupbuy',
  'distribution',
  'teaching',
  'attendance',
  'class-transfer',
  'lesson-reschedule',
];
const ACTIONS = ['view', 'create', 'update', 'delete', 'export'];

/** 业务动作型权限点（非标准 增删改查，如分配/跟进/转化/上传） */
const EXTRA_PERMS = ['lead:assign', 'lead:follow', 'lead:convert', 'resource:upload', 'tenant:manage', 'tenant:view'];

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
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
    // 业务动作型权限点（如 lead:assign/follow/convert）
    for (const code of EXTRA_PERMS) {
      let p = await this.permRepo.findOne({ where: { tenantId, code } });
      if (!p) {
        p = this.permRepo.create({
          tenantId,
          code,
          name: code,
          group: code.split(':')[0],
        });
        p = await this.permRepo.save(p);
      }
      permMap.set(code, p);
    }
    const allPerms = [...permMap.values()];

    // 0) 平台角色模板（tenant_id=0）：新增权限点统一演进，租户角色可继承（模板+覆盖模型，P1-3）
    const tplAdmin = await this.ensureTemplates();

    // 2) 角色
    const ensureRole = async (
      code: string,
      name: string,
      perms: Permission[],
      dataScope: 'all' | 'org' | 'org_and_below' | 'self' = 'org',
      inheritsFromId?: number,
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
        if (inheritsFromId) (role as any).inheritsFrom = { id: inheritsFromId };
        role = await this.roleRepo.save(role);
      }
      return role;
    };

    const superAdmin = await ensureRole('super_admin', '超级管理员', allPerms, 'all', tplAdmin.id);
    // 兼容已有租户：把新增权限点同步进超级管理员（幂等）
    const sa = await this.roleRepo.findOne({ where: { tenantId, code: 'super_admin' }, relations: ['permissions'] });
    if (sa) {
      const have = new Set((sa.permissions || []).map((p) => p.code));
      const missing = allPerms.filter((p) => !have.has(p.code));
      if (missing.length) {
        sa.permissions = [...(sa.permissions || []), ...missing];
        await this.roleRepo.save(sa);
      }
    }
    // 老师可上传课件资源（resource:upload 为动作型权限，不在标准 ACTIONS 内）
    const teacherPerms = MODULES.flatMap((m) =>
      [permMap.get(`${m}:view`), permMap.get(`${m}:create`), permMap.get(`${m}:update`)].filter(
        Boolean,
      ) as Permission[],
    );
    const uploadPerm = permMap.get('resource:upload');
    if (uploadPerm) teacherPerms.push(uploadPerm);
    await ensureRole('teacher', '授课老师', teacherPerms, 'self');
    await ensureRole(
      'finance',
      '财务',
      ['order:view', 'order:create', 'order:update', 'report:view', 'hour:view', 'finance:view', 'finance:create', 'finance:update', 'task:view'].map(
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
    // 为租户内全部用户补 membership（状态机 ACTIVE），幂等
    await this.seedMemberships(tenantId);
    return admin;
  }

  /** 确保平台角色模板(tenant_id=0)存在：含全部权限点，供租户角色继承（P1-3） */
  private async ensureTemplates(): Promise<Role> {
    const T0 = 0;
    const codes: string[] = [];
    for (const m of MODULES) for (const a of ACTIONS) codes.push(`${m}:${a}`);
    for (const c of EXTRA_PERMS) codes.push(c);
    const perms: Permission[] = [];
    for (const code of codes) {
      let p = await this.permRepo.findOne({ where: { tenantId: T0, code } });
      if (!p) {
        p = this.permRepo.create({
          tenantId: T0,
          code,
          name: code,
          group: code.split(':')[0],
        } as Permission);
        p = await this.permRepo.save(p);
      }
      perms.push(p);
    }
    const ensureTpl = async (code: string, name: string): Promise<Role> => {
      let r = await this.roleRepo.findOne({ where: { tenantId: T0, code }, relations: ['permissions'] });
      if (!r) {
        r = this.roleRepo.create({ tenantId: T0, code, name, dataScope: 'all', permissions: perms } as Role);
        await this.roleRepo.save(r);
      }
      return r;
    };
    return ensureTpl('tenant_admin', '平台角色模板-租户管理员');
  }

  /** 为租户内全部用户确保存在 ACTIVE membership（幂等；已 REMOVED 的不复活） */
  async seedMemberships(tenantId: number) {
    const users = await this.userRepo.find({ where: { tenantId } });
    for (const u of users) {
      const exist = await this.membershipRepo.findOne({
        where: { tenantId, userId: u.id },
        withDeleted: true,
      });
      if (!exist) {
        await this.membershipRepo.save(
          this.membershipRepo.create({ tenantId, userId: u.id, status: 'ACTIVE' } as Membership),
        );
      }
    }
  }

  // ==================== 用户管理 ====================
  async listUsers(tenantId: number, q: PageQueryDto, keyword?: string) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.tenant_id = :t', { t: tenantId });
    if (keyword) {
      qb.andWhere('(u.username LIKE :kw OR u.name LIKE :kw OR u.phone LIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }
    qb.orderBy('u.id', 'DESC').skip((q.page - 1) * q.size).take(q.size);
    const [list, total] = await qb.getManyAndCount();
    return {
      list: list.map((u) => this.safeUser(u)),
      total,
      page: q.page,
      size: q.size,
      totalPages: Math.ceil(total / q.size),
    };
  }

  async createUser(tenantId: number, d: CreateUserDto) {
    const exists = await this.userRepo.findOne({
      where: { tenantId, username: d.username },
    });
    if (exists) throw new BusinessException(ResCode.CONFLICT, '登录账号已存在');
    const roles = d.roleIds?.length
      ? await this.roleRepo.findBy({ id: In(d.roleIds), tenantId })
      : [];
    const user = this.userRepo.create({
      tenantId,
      username: d.username,
      passwordHash: await bcrypt.hash(d.password, 10),
      name: d.name,
      phone: d.phone,
      email: d.email,
      status: d.status ?? 1,
      roles,
      orgIds: d.orgIds ?? null,
    });
    const saved = await this.userRepo.save(user);
    // 创建用户同时建立 membership（状态机 ACTIVE），作为跨租户身份与生命周期事实来源
    await this.membershipRepo.save(
      this.membershipRepo.create({ tenantId, userId: saved.id, status: 'ACTIVE' } as Membership),
    );
    return this.safeUser(saved);
  }

  async updateUser(tenantId: number, id: number, d: UpdateUserDto) {
    const user = await this.userRepo.findOne({
      where: { tenantId, id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('用户不存在');
    if (d.name !== undefined) user.name = d.name;
    if (d.phone !== undefined) user.phone = d.phone;
    if (d.email !== undefined) user.email = d.email;
    if (d.status !== undefined) user.status = d.status;
    if (d.roleIds) {
      user.roles = await this.roleRepo.findBy({ id: In(d.roleIds), tenantId });
    }
    if (d.orgIds !== undefined) {
      user.orgIds = d.orgIds ?? null;
    }
    return this.safeUser(await this.userRepo.save(user));
  }

  async resetPassword(tenantId: number, id: number, password: string) {
    const user = await this.userRepo.findOne({ where: { tenantId, id } });
    if (!user) throw new NotFoundException('用户不存在');
    user.passwordHash = await bcrypt.hash(password, 10);
    await this.userRepo.save(user);
    return { id: user.id, username: user.username };
  }

  async removeUser(tenantId: number, id: number, currentUserId: number) {
    if (id === currentUserId) {
      throw new BusinessException(ResCode.BAD_REQUEST, '不能删除当前登录账号');
    }
    const user = await this.userRepo.findOne({ where: { tenantId, id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.userRepo.softRemove(user);
    return { id };
  }

  // ==================== 角色管理 ====================
  async listRoles(tenantId: number) {
    const roles = await this.roleRepo.find({
      where: { tenantId },
      order: { id: 'ASC' } as any,
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      dataScope: r.dataScope,
      permissions: (r.permissions || []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        group: p.group,
      })),
    }));
  }

  async createRole(tenantId: number, d: CreateRoleDto) {
    const exists = await this.roleRepo.findOne({
      where: { tenantId, code: d.code },
    });
    if (exists) throw new BusinessException(ResCode.CONFLICT, '角色编码已存在');
    const permissions = d.permissionIds?.length
      ? await this.permRepo.findBy({ id: In(d.permissionIds), tenantId })
      : [];
    const role = this.roleRepo.create({
      tenantId,
      code: d.code,
      name: d.name,
      dataScope: d.dataScope ?? 'org',
      permissions,
    });
    return this.roleRepo.save(role);
  }

  async updateRole(tenantId: number, id: number, d: UpdateRoleDto) {
    const role = await this.roleRepo.findOne({
      where: { tenantId, id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('角色不存在');
    if (d.name !== undefined) role.name = d.name;
    if (d.dataScope !== undefined) role.dataScope = d.dataScope;
    if (d.permissionIds) {
      role.permissions = await this.permRepo.findBy({
        id: In(d.permissionIds),
        tenantId,
      });
    }
    return this.roleRepo.save(role);
  }

  async removeRole(tenantId: number, id: number) {
    const role = await this.roleRepo.findOne({ where: { tenantId, id } });
    if (!role) throw new NotFoundException('角色不存在');
    if (role.code === 'super_admin') {
      throw new BusinessException(ResCode.BAD_REQUEST, '内置超级管理员角色不可删除');
    }
    await this.roleRepo.softRemove(role);
    return { id };
  }

  // ==================== 权限点 ====================
  async listPermissions(tenantId: number) {
    return this.permRepo.find({
      where: { tenantId },
      order: { group: 'ASC', code: 'ASC' } as any,
    });
  }

  /** 脱敏输出：移除密码哈希 */
  private safeUser(u: User) {
    const { passwordHash, ...rest } = u as any;
    void passwordHash;
    return {
      ...rest,
      roles: (u.roles || []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    };
  }
}
