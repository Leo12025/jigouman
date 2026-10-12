import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../rbac/user.entity';
import { Role } from '../rbac/role.entity';
import { Membership } from '../rbac/membership.entity';
import { AuthUser } from '../../common/decorators/auth.decorator';

export interface JwtPayload {
  sub: number;
  tenantId: number;
  username: string;
  /** 令牌用途：access 访问令牌 / refresh 刷新令牌 */
  type?: 'access' | 'refresh';
  /** 身份类型：staff 员工/管理员；parent 家长（移动端 H5，§6.23） */
  kind?: 'staff' | 'parent';
  /** 家长手机号（kind=parent 时有值） */
  phone?: string;
}

/** dataScope 优先级：数值越大范围越宽 */
const SCOPE_RANK: Record<string, number> = { self: 0, org: 1, org_and_below: 2, all: 3 };

/**
 * JWT 策略：校验 Bearer Token，并加载用户角色/权限（含模板继承）与 membership 状态，
 * 将 AuthUser（含 permissions 合集、dataScope、orgIds）挂载到 req.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get('JWT_SECRET') || 'please-change-me-in-prod',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // 刷新令牌不能用于访问业务接口
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('请使用访问令牌');
    }
    // 家长端（移动端 H5，§6.23）：无 sys_user 账号与 RBAC 权限，身份由 parent 账号签发
    if (payload.kind === 'parent') {
      return {
        id: payload.sub,
        tenantId: payload.tenantId,
        username: payload.username,
        roleIds: [],
        permissions: [],
        kind: 'parent',
        phone: payload.phone,
      };
    }
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
      relations: ['roles'],
    });
    if (!user || user.status !== 1) {
      throw new UnauthorizedException('账号不可用');
    }
    // membership 状态机校验（P2）：存在且非 ACTIVE 则拒绝新会话，但保留审计
    const membership = await this.membershipRepo.findOne({
      where: { tenantId: payload.tenantId, userId: user.id },
    });
    if (membership && membership.status !== 'ACTIVE') {
      throw new UnauthorizedException('该账号已被停用或移除');
    }

    // 加载角色完整链（自身权限 + 继承的模板权限），计算有效权限合集与最宽数据范围
    const roleIds = (user.roles || []).map((r) => r.id);
    const roles = roleIds.length
      ? await this.roleRepo.find({
          where: { id: In(roleIds) },
          relations: ['permissions', 'inheritsFrom', 'inheritsFrom.permissions'],
        })
      : [];
    const permissions = new Set<string>();
    let scopeRank = 0;
    roles.forEach((r) => {
      (r.permissions || []).forEach((p) => permissions.add(p.code));
      // 模板+覆盖：继承的平台模板权限并入（重复自动去重）
      if (r.inheritsFrom) {
        (r.inheritsFrom.permissions || []).forEach((p) => permissions.add(p.code));
      }
      if (r.dataScope && SCOPE_RANK[r.dataScope] > scopeRank) {
        scopeRank = SCOPE_RANK[r.dataScope];
      }
    });
    const dataScope = (Object.keys(SCOPE_RANK) as string[]).find(
      (k) => SCOPE_RANK[k] === scopeRank,
    ) as AuthUser['dataScope'];

    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roleIds,
      permissions: [...permissions],
      kind: 'staff',
      orgIds: user.orgIds || [],
      dataScope,
    };
  }
}
