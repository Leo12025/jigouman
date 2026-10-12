import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../rbac/user.entity';
import { Role } from '../rbac/role.entity';
import { Membership } from '../rbac/membership.entity';
import { TenantModule } from '../../modules/tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Membership]),
    TenantModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET') || 'please-change-me-in-prod',
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') || '2h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
