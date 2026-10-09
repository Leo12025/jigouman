import { Controller, Post, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  CreateComplaintDto, AssignComplaintDto, ResolveComplaintDto, ComplaintPageQueryDto,
} from './dto/complaint.dto';
import { ComplaintService } from './complaint.service';

@ApiTags('客诉管理 Complaint')
@Controller('complaints')
export class ComplaintController {
  constructor(private readonly svc: ComplaintService) {}

  @Post()
  @RequirePermissions('complaint:create')
  @OperationLog({ action: 'complaint:create', target: 'complaint' })
  @ApiOperation({ summary: '登记客诉(§4.26 客诉分派→COMPLAINT 待办)' })
  create(@TenantId() t: number, @Body() d: CreateComplaintDto, @CurrentUser() u: AuthUser) {
    return this.svc.create(t, d, u.id);
  }

  @Get()
  @RequirePermissions('complaint:view')
  @ApiOperation({ summary: '客诉列表(状态/等级/处理人筛选)' })
  list(@TenantId() t: number, @Query() q: ComplaintPageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('complaint:view')
  @ApiOperation({ summary: '客诉详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.get(t, Number(id));
  }

  @Put(':id/assign')
  @RequirePermissions('complaint:update')
  @OperationLog({ action: 'complaint:assign', target: 'complaint' })
  @ApiOperation({ summary: '分派/改派处理人(关闭旧待办+生成新待办)' })
  assign(@TenantId() t: number, @Param('id') id: number, @Body() d: AssignComplaintDto) {
    return this.svc.assign(t, Number(id), d);
  }

  @Post(':id/resolve')
  @RequirePermissions('complaint:update')
  @OperationLog({ action: 'complaint:resolve', target: 'complaint' })
  @ApiOperation({ summary: '处理完成(标记结论并关闭待办)' })
  resolve(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: ResolveComplaintDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.resolve(t, Number(id), d, u.id);
  }
}
