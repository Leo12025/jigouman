import {
  Controller, Post, Get, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  HourAccountPageQueryDto, HourConsumptionPageQueryDto, AttendLessonDto, LeaveLessonDto,
  GrantHourDto, ScheduleMakeupDto, GrantEntitlementDto, EnrollDto,
  AccountActionDto, ExtendExpiryDto, ConfirmConsumptionDto,
} from './dto/hour.dto';
import { HourService } from './hour.service';

@ApiTags('课时管理 Hour')
@Controller()
export class HourController {
  constructor(private readonly svc: HourService) {}

  @Get('students/:id/hours')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '学员课时余额(按课程聚合)' })
  balance(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.balance(t, Number(id));
  }

  @Get('hour-accounts')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '课时账户列表' })
  accounts(@TenantId() t: number, @Query() q: HourAccountPageQueryDto) {
    return this.svc.listAccounts(t, q);
  }

  @Get('hour-accounts/expiring')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '临近到期课时账户(家长端+顾问端提醒)' })
  expiring(@TenantId() t: number, @Query('days') days?: number) {
    return this.svc.listExpiring(t, Number(days) || 7);
  }

  @Get('hour-consumptions')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '课时流水(发放/消课/回滚/过期)' })
  consumptions(@TenantId() t: number, @Query() q: HourConsumptionPageQueryDto) {
    return this.svc.listConsumptions(t, q);
  }

  @Post('hour-accounts/grant')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:grant', target: 'hour_account' })
  @ApiOperation({ summary: '手动发放/校正课时(grantType=GIFT 即赠课)' })
  grant(@TenantId() t: number, @Body() d: GrantHourDto, @CurrentUser() u: AuthUser) {
    return this.svc.grantManual(t, d, u.id);
  }

  @Post('hour-accounts/freeze')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:freeze', target: 'hour_account' })
  @ApiOperation({ summary: '停课冻结(保留剩余课时与学费)' })
  freeze(@TenantId() t: number, @Body() d: AccountActionDto, @CurrentUser() u: AuthUser) {
    return this.svc.freezeAccount(t, Number(d.accountId), u.id);
  }

  @Post('hour-accounts/unfreeze')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:unfreeze', target: 'hour_account' })
  @ApiOperation({ summary: '复课解冻' })
  unfreeze(@TenantId() t: number, @Body() d: AccountActionDto, @CurrentUser() u: AuthUser) {
    return this.svc.unfreezeAccount(t, Number(d.accountId), u.id);
  }

  @Post('hour-accounts/close')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:close', target: 'hour_account' })
  @ApiOperation({ summary: '结课(清空剩余课时,学费转机构手续费)' })
  close(@TenantId() t: number, @Body() d: AccountActionDto, @CurrentUser() u: AuthUser) {
    return this.svc.closeAccount(t, Number(d.accountId), u.id);
  }

  @Post('hour-accounts/extend')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:extend', target: 'hour_account' })
  @ApiOperation({ summary: '有效期延期申请' })
  extend(@TenantId() t: number, @Body() d: ExtendExpiryDto, @CurrentUser() u: AuthUser) {
    return this.svc.extendExpiry(t, Number(d.accountId), Number(d.days), u.id);
  }

  @Post('hour-consumptions/:id/confirm')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:confirm', target: 'hour_consumption' })
  @ApiOperation({ summary: '家长确认消课(一课一消)' })
  confirm(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: ConfirmConsumptionDto,
  ) {
    return this.svc.confirmConsumption(t, Number(id), d.status);
  }

  // ---------------- BY_TIME：时间型权益 ----------------

  @Post('entitlements')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:grant-entitlement', target: 'entitlement' })
  @ApiOperation({ summary: '发放时间型权益(年卡/月卡,有效期内不限次)' })
  grantEntitlement(@TenantId() t: number, @Body() d: GrantEntitlementDto, @CurrentUser() u: AuthUser) {
    return this.svc.grantEntitlement(t, {
      studentId: Number(d.studentId),
      packageId: d.packageId,
      courseId: d.courseId,
      startAt: d.startAt ? new Date(d.startAt) : undefined,
      expireAt: new Date(d.expireAt),
      refOrderId: d.refOrderId,
      operatorId: u.id,
    });
  }

  @Get('entitlements')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '时间型权益列表' })
  entitlements(@TenantId() t: number, @Query('studentId') studentId?: number) {
    return this.svc.listEntitlements(t, studentId ? Number(studentId) : undefined);
  }

  // ---------------- BY_PERIOD：期课报名 ----------------

  @Post('enrollments')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:enroll', target: 'enrollment' })
  @ApiOperation({ summary: '期课报名/班期绑定(支持插班折减)' })
  enroll(@TenantId() t: number, @Body() d: EnrollDto) {
    return this.svc.enroll(t, {
      studentId: Number(d.studentId),
      classGroupId: d.classGroupId,
      courseId: d.courseId,
      packageId: d.packageId,
      joinType: d.joinType,
      discountHours: d.discountHours,
      discountAmount: d.discountAmount,
      totalLessons: d.totalLessons,
      refOrderId: d.refOrderId,
    });
  }

  @Get('enrollments')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '期课报名列表' })
  enrollments(@TenantId() t: number, @Query('studentId') studentId?: number) {
    return this.svc.listEnrollments(t, studentId ? Number(studentId) : undefined);
  }

  // ---------------- 点名 / 请假 / 补课 ----------------

  @Post('lessons/:id/attendance')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:attendance', target: 'lesson' })
  @ApiOperation({ summary: '课次点名消课(BY_HOUR 扣课时;年卡/期课只记出勤)' })
  attend(@TenantId() t: number, @Param('id') id: number, @Body() d: AttendLessonDto, @CurrentUser() u: AuthUser) {
    return this.svc.attendLesson(t, Number(id), d.records, u.id);
  }

  @Post('lessons/:id/leave')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:leave', target: 'lesson' })
  @ApiOperation({ summary: '课次请假(记考勤,不消课)' })
  leave(@TenantId() t: number, @Param('id') id: number, @Body() d: LeaveLessonDto, @CurrentUser() u: AuthUser) {
    return this.svc.leaveLesson(t, Number(id), d.studentId, u.id);
  }

  @Post('lessons/makeup')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:makeup', target: 'lesson' })
  @ApiOperation({ summary: '补课排课(请假后补课,占用可用课时)' })
  makeup(@TenantId() t: number, @Body() d: ScheduleMakeupDto) {
    return this.svc.scheduleMakeup(t, d);
  }
}
