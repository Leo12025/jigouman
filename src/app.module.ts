import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  OnModuleInit,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './core/database/database.module';
import { AuditModule } from './core/audit/audit.module';
import { AuditInterceptor } from './core/audit/audit.interceptor';
import { AuthModule } from './core/auth/auth.module';
import { JwtAuthGuard } from './core/auth/jwt-auth.guard';
import { TenantGuard } from './core/tenant/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RbacModule } from './core/rbac/rbac.module';
import { RbacService } from './core/rbac/rbac.service';

import { CourseModule } from './modules/course/course.module';
import { StudentModule } from './modules/student/student.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    RbacModule,
    CourseModule,
    StudentModule,
  ],
  providers: [
    // 鉴权顺序：JWT 校验 → 解析租户 → 校验权限
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // 审计拦截（写操作落日志）
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly rbac: RbacService) {}

  async onModuleInit() {
    // 默认租户初始化：权限点、角色、超级管理员（幂等）
    const tenantId = Number(process.env.DEFAULT_TENANT_ID) || 0;
    await this.rbac.seedTenant(tenantId);
  }
}
