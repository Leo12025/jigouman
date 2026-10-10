import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import { ClockDto } from './dto/attendance.dto';

@ApiTags('老师考勤 Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  @Post('clock')
  @RequirePermissions('attendance:create')
  @ApiOperation({ summary: '老师打卡(IN/OUT/课次打卡)' })
  clock(@TenantId() t: number, @Body() d: ClockDto) {
    return this.svc.clock(t, d);
  }

  @Get()
  @RequirePermissions('attendance:view')
  @ApiOperation({ summary: '我的打卡记录' })
  list(
    @TenantId() t: number,
    @Query('teacherId') teacherId: number,
    @Query('date') date?: string,
  ) {
    return this.svc.list(t, Number(teacherId), date);
  }
}
