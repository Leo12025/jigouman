import {
  Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { CreateClassTransferDto, CreateLessonRescheduleDto } from './dto/class-change.dto';
import { ClassChangeService } from './class-change.service';

@ApiTags('调课/转班 ClassChange')
@Controller('class-change')
export class ClassChangeController {
  constructor(private readonly svc: ClassChangeService) {}

  @Post('transfers')
  @RequirePermissions('class-transfer:create')
  @ApiOperation({ summary: '发起转班申请(进入审批中心，携带补差价)' })
  createTransfer(
    @TenantId() t: number,
    @Body() d: CreateClassTransferDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.createTransfer(t, d, u);
  }

  @Get('transfers')
  @RequirePermissions('class-transfer:view')
  @ApiOperation({ summary: '转班申请列表' })
  listTransfers(@TenantId() t: number, @Query() q: any) {
    return this.svc.listTransfers(t, q);
  }

  @Post('reschedules')
  @RequirePermissions('lesson-reschedule:create')
  @ApiOperation({ summary: '发起调课申请(进入审批中心)' })
  createReschedule(
    @TenantId() t: number,
    @Body() d: CreateLessonRescheduleDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.createReschedule(t, d, u);
  }

  @Get('reschedules')
  @RequirePermissions('lesson-reschedule:view')
  @ApiOperation({ summary: '调课申请列表' })
  listReschedules(@TenantId() t: number, @Query() q: any) {
    return this.svc.listReschedules(t, q);
  }
}
