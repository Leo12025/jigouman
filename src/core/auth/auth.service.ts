import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../rbac/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import { AuthUser } from '../../common/decorators/auth.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** 账号密码校验 */
  async validate(
    username: string,
    password: string,
    tenantId: number,
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { username, tenantId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new UnauthorizedException('账号或密码错误');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('账号或密码错误');
    if (user.status !== 1) throw new UnauthorizedException('账号已被禁用');
    return user;
  }

  /** 登录签发双令牌 */
  async login(dto: LoginDto) {
    const tenantId = dto.tenantId ?? (Number(process.env.DEFAULT_TENANT_ID) || 0);
    const user = await this.validate(dto.username, dto.password, tenantId);
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      username: user.username,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '2h',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles?.map((r) => ({ code: r.code, name: r.name })),
      },
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
}
