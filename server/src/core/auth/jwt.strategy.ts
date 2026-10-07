import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../rbac/user.entity';
import { AuthUser } from '../../common/decorators/auth.decorator';

export interface JwtPayload {
  sub: number;
  tenantId: number;
  username: string;
  /** 令牌用途：access 访问令牌 / refresh 刷新令牌 */
  type?: 'access' | 'refresh';
}

/**
 * JWT 策略：校验 Bearer Token，并加载用户角色/权限，
 * 将 AuthUser（含 permissions 合集）挂载到 req.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user || user.status !== 1) {
      throw new UnauthorizedException('账号不可用');
    }
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
}
