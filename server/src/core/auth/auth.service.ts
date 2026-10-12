import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../rbac/user.entity';
import { Membership } from '../rbac/membership.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { TenantService } from '../../modules/tenant/tenant.service';

/** dataScope 优先级：数值越大范围越宽（与 jwt.strategy 保持一致） */
const SCOPE_RANK: Record<string, number> = { self: 0, org: 1, org_and_below: 2, all: 3 };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    private readonly jwtService: JwtService,
    private readonly tenantService: TenantService,
  ) {}

  /** 账号密码校验（含 membership 状态机校验，P2：SUSPENDED/REMOVED 拒绝登录） */
  async validate(
    username: string,
    password: string,
    tenantId: number,
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { username, tenantId },
      relations: ['roles', 'roles.permissions', 'roles.inheritsFrom', 'roles.inheritsFrom.permissions'],
    });
    if (!user) throw new UnauthorizedException('账号或密码错误');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('账号或密码错误');
    if (user.status !== 1) throw new UnauthorizedException('账号已被禁用');
    const mb = await this.membershipRepo.findOne({
      where: { tenantId, userId: user.id },
    });
    if (mb && mb.status !== 'ACTIVE') {
      throw new UnauthorizedException('该账号已被停用或移除');
    }
    return user;
  }

  /**
   * 由 User 实体计算登录时写入 JWT 的鉴权声明：
   * 合并自身权限 + 继承的模板权限，取最宽 dataScope。
   * 仅在登录/刷新/微信登录时计算一次，避免每请求重查权限图（性能优化核心）。
   */
  private buildClaims(user: User) {
    const permissions = new Set<string>();
    let scopeRank = 0;
    user.roles?.forEach((r) => {
      r.permissions?.forEach((p) => permissions.add(p.code));
      if (r.inheritsFrom) {
        r.inheritsFrom.permissions?.forEach((p) => permissions.add(p.code));
      }
      if (r.dataScope && SCOPE_RANK[r.dataScope] > scopeRank) {
        scopeRank = SCOPE_RANK[r.dataScope];
      }
    });
    const dataScope = (Object.keys(SCOPE_RANK) as string[]).find(
      (k) => SCOPE_RANK[k] === scopeRank,
    ) as AuthUser['dataScope'];
    return {
      roleIds: user.roles?.map((r) => r.id) || [],
      permissions: [...permissions],
      orgIds: user.orgIds || [],
      dataScope,
      status: user.status,
    };
  }

  /** 登录签发双令牌（access 短时效 / refresh 长时效，§9.2） */
  async login(dto: LoginDto, resolvedTenantId?: number) {
    let username = dto.username.trim();
    let tenantId =
      dto.tenantId ?? resolvedTenantId ?? (Number(process.env.DEFAULT_TENANT_ID) || 0);

    // 用户名@品牌域：从 @ 后缀解析品牌（slug/domain），快速定位对应租户
    const at = username.indexOf('@');
    if (at > 0) {
      const suffix = username.slice(at + 1).trim();
      const name = username.slice(0, at).trim();
      if (suffix) {
        const brand = await this.tenantService.findBySlugOrDomain(suffix);
        if (brand) {
          tenantId = brand.id;
          username = name;
        }
        // 后缀不匹配任何品牌域时，回退到域名/默认租户 + 完整用户名（兼容邮箱式账号）
      }
    }

    // 租户可用性校验（停用 / 过期拦截）
    await this.tenantService.assertUsable(tenantId);

    const user = await this.validate(username, dto.password, tenantId);
    // 性能优化：将角色/权限/校区/数据范围一次性写入 JWT，后续请求不再查库（见 jwt.strategy）
    const base: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      username: user.username,
      ...this.buildClaims(user),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...base, type: 'access' },
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' },
      ),
      this.jwtService.signAsync(
        { ...base, type: 'refresh' },
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
      ),
    ]);
    return { accessToken, refreshToken, user: this.toUserInfo(user) };
  }

  /**
   * 刷新访问令牌：用 refreshToken 换取新的 accessToken。
   * 校验签名、有效期、令牌类型与账号状态。
   */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_SECRET || 'please-change-me-in-prod',
      });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('令牌类型错误，请使用刷新令牌');
    }
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
      relations: ['roles', 'roles.permissions', 'roles.inheritsFrom', 'roles.inheritsFrom.permissions'],
    });
    if (!user || user.status !== 1) {
      throw new UnauthorizedException('账号不可用');
    }
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tenantId: user.tenantId,
        username: user.username,
        type: 'access',
        ...this.buildClaims(user),
      } as JwtPayload,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' },
    );
    return { accessToken, user: this.toUserInfo(user) };
  }

  /** 当前登录用户信息（顶栏展示：机构/租户、角色、权限点） */
  async profile(tenantId: number, userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId, tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new UnauthorizedException('账号不存在');
    const permissions = new Set<string>();
    user.roles?.forEach((r) =>
      r.permissions?.forEach((p) => permissions.add(p.code)),
    );
    // 透出租户域（slug/domain），供前端展示「用户名@域（租户）名」登录身份
    let tenantSlug = process.env.DEFAULT_TENANT_SLUG || 'default';
    let tenantDomain = process.env.DEFAULT_TENANT_DOMAIN || 'localhost';
    try {
      const t = await this.tenantService.get(tenantId);
      if (t) {
        tenantSlug = t.slug;
        tenantDomain = t.domain || tenantDomain;
      }
    } catch {
      // 租户元数据缺失时回退默认值，不影响主流程
    }
    return {
      ...this.toUserInfo(user),
      permissions: [...permissions],
      orgName: process.env.DEFAULT_TENANT_NAME || '默认机构',
      tenantSlug,
      tenantDomain,
    };
  }

  /** 初始化超级管理员（首次启动/seeding 用） */
  async seedAdmin(tenantId: number, username: string, password: string) {
    const exists = await this.userRepo.findOne({ where: { username, tenantId } });
    if (exists) return exists;
    const hash = await bcrypt.hash(password, 10);
    const admin = this.userRepo.create({
      tenantId,
      username,
      passwordHash: hash,
      name: '超级管理员',
      status: 1,
      roles: [],
    });
    return this.userRepo.save(admin);
  }

  buildAuthUser(user: User): AuthUser {
    const permissions = new Set<string>();
    user.roles?.forEach((r) =>
      r.permissions?.forEach((p) => permissions.add(p.code)),
    );
    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roleIds: user.roles?.map((r) => r.id) || [],
      permissions: [...permissions],
    };
  }

  private toUserInfo(user: User) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      tenantId: user.tenantId,
      orgIds: user.orgIds || [],
      roles: user.roles?.map((r) => ({ id: r.id, code: r.code, name: r.name })) || [],
    };
  }

  // ---------- 管理员微信登录 / 绑定（配置驱动：WX_APPID / WX_SECRET） ----------

  /** 微信 code -> openid（公众号网页授权 / 小程序 login 拿到的 code） */
  private async exchangeWechatOpenid(code: string): Promise<string> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appid || !secret) {
      throw new UnauthorizedException('微信登录未配置（缺少 WX_APPID / WX_SECRET）');
    }
    const url =
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}` +
      `&secret=${secret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const res = await fetch(url);
    const data: any = await res.json();
    if (data.errcode) {
      throw new UnauthorizedException(`微信授权失败: ${data.errcode} ${data.errmsg}`);
    }
    return data.openid as string;
  }

  /** 微信登录：code 换 openid，命中已绑定账号则签发令牌 */
  async wechatLogin(code: string) {
    const openid = await this.exchangeWechatOpenid(code);
    const user = await this.userRepo.findOne({
      where: { wechatOpenid: openid } as any,
      relations: ['roles', 'roles.permissions', 'roles.inheritsFrom', 'roles.inheritsFrom.permissions'],
    });
    if (!user) throw new UnauthorizedException('该微信未绑定账号，请先绑定');
    if (user.status !== 1) throw new UnauthorizedException('账号已被禁用');
    await this.tenantService.assertUsable(user.tenantId);
    const base: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      username: user.username,
      ...this.buildClaims(user),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...base, type: 'access' }, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }),
      this.jwtService.signAsync({ ...base, type: 'refresh' }, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
    ]);
    return { accessToken, refreshToken, user: this.toUserInfo(user) };
  }

  /** 微信绑定并登录：code 换 openid，绑定到当前租户下指定手机号账号 */
  async wechatBind(tenantId: number, code: string, phone: string) {
    await this.tenantService.assertUsable(tenantId);
    const openid = await this.exchangeWechatOpenid(code);
    const user = await this.userRepo.findOne({
      where: { tenantId, phone } as any,
      relations: ['roles', 'roles.permissions', 'roles.inheritsFrom', 'roles.inheritsFrom.permissions'],
    });
    if (!user) throw new UnauthorizedException('该手机号账号不存在');
    user.wechatOpenid = openid;
    await this.userRepo.save(user as any);
    const base: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      username: user.username,
      ...this.buildClaims(user),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...base, type: 'access' }, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }),
      this.jwtService.signAsync({ ...base, type: 'refresh' }, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
    ]);
    return { accessToken, refreshToken, user: this.toUserInfo(user) };
  }
}
