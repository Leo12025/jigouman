import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../rbac/user.entity';
import { Membership } from '../rbac/membership.entity';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { LruCache } from '../../common/lru-cache';

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
  // ---- 性能优化：登录时即写入的鉴权声明，避免每请求重查角色权限图 ----
  /** 角色 id 列表 */
  roleIds?: number[];
  /** 合并后的有效权限点（含继承的模板权限） */
  permissions?: string[];
  /** 归属校区 id 列表 */
  orgIds?: number[];
  /** 最宽数据范围 */
  dataScope?: AuthUser['dataScope'];
  /** 账号状态快照（1=启用），快速失败用；实时吊销由下方 TTL 缓存兜底 */
  status?: number;
}

const STATE_TTL = Number(process.env.AUTH_STATE_TTL_MS) || 30_000;
/**
 * 轻量吊销校验缓存：LRU 上限 + TTL。
 * 此前用裸 Map，key(用户ID)只增不减，长期运行会随登录用户数线性增长。
 */
const stateCache = new LruCache<boolean>({ max: 5000, ttlMs: STATE_TTL });

/**
 * JWT 策略：校验 Bearer Token，读取登录时写入的鉴权声明（角色/权限/校区/数据范围），
 * 并将 AuthUser 挂载到 req.user。权限图已在登录时计算并内嵌，故本方法不再打库（仅做 TTL 缓存的轻量吊销校验）。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

    // 轻量吊销校验：仅查 id/status 两列 + membership.status，带 TTL 缓存。
    // 权限图（角色/权限/inheritsFrom）已在登录时写入 JWT，不再每请求重查（原 3 次库 ->
    // 至多 2 次轻查询且每 STATE_TTL 才一次），彻底消除 15s 超时的主要来源。
    let active: boolean | undefined;
    const cached = stateCache.get(String(payload.sub));
    // 注意用 !== undefined 判断：false(已停用) 也是有效缓存值，不能当作未命中
    if (cached !== undefined) {
      active = cached;
    } else {
      const u = await this.userRepo.findOne({
        where: { id: payload.sub, tenantId: payload.tenantId },
        select: ['id', 'status'],
      });
      const mb = await this.membershipRepo.findOne({
        where: { tenantId: payload.tenantId, userId: payload.sub },
        select: ['status'],
      });
      active = !!u && u.status === 1 && !!mb && mb.status === 'ACTIVE';
      stateCache.set(String(payload.sub), active);
    }
    if (!active) {
      throw new UnauthorizedException('该账号已被停用或移除');
    }

    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      username: payload.username,
      roleIds: payload.roleIds || [],
      permissions: payload.permissions || [],
      kind: 'staff',
      orgIds: payload.orgIds || [],
      dataScope: payload.dataScope,
    };
  }
}
