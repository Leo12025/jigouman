import {
  Controller, Post, Get, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  HourAccountPageQueryDto, HourConsumptionPageQueryDto, AttendLessonDto, LeaveLessonDto, GrantHourDto,
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

  @Get('hour-consumptions')
  @RequirePermissions('hour:view')
  @ApiOperation({ summary: '课时流水(发放/消课/回滚)' })
  consumptions(@TenantId() t: number, @Query() q: HourConsumptionPageQueryDto) {
    return this.svc.listConsumptions(t, q);
  }

  @Post('hour-accounts/grant')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:grant', target: 'hour_account' })
  @ApiOperation({ summary: '手动发放/校正课时' })
  grant(@TenantId() t: number, @Body() d: GrantHourDto, @CurrentUser() u: AuthUser) {
    return this.svc.grantManual(t, d, u.id);
  }

  @Post('lessons/:id/attendance')
  @RequirePermissions('hour:update')
  @OperationLog({ action: 'hour:attendance', target: 'lesson' })
  @ApiOperation({ summary: '课次点名消课(出勤/补课扣课时,请假/缺勤不扣)' })
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
}
