import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';

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
import { LeadModule } from './modules/lead/lead.module';
import { OrderModule } from './modules/order/order.module';
import { HourModule } from './modules/hour/hour.module';
import { FinanceModule } from './modules/finance/finance.module';
import { TaskModule } from './modules/task/task.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { ParentModule } from './modules/parent/parent.module';
import { FamilyModule } from './modules/family/family.module';
import { GrowthModule } from './modules/growth/growth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ApprovalModule } from './modules/approval/approval.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // 全局限流（文档 §9.2 防刷限流）；登录/刷新接口用 @Throttle 单独收紧
    ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 300 }]),
    DatabaseModule,
    AuditModule,
    AuthModule,
    RbacModule,
    CourseModule,
    StudentModule,
    LeadModule,
    OrderModule,
    HourModule,
    FinanceModule,
    TaskModule,
    HomeworkModule,
    ParentModule,
    FamilyModule,
    GrowthModule,
    DashboardModule,
    NotificationModule,
    ApprovalModule,
  ],
  providers: [
    // 鉴权顺序：限流 → JWT 校验 → 解析租户 → 校验权限
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
