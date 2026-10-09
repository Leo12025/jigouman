import {
  Controller, Post, Get, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import {
  CreateApprovalDto, ApprovalPageQueryDto, ApprovalActionDto,
} from './dto/approval.dto';
import {
  CreateApprovalFlowDto, UpdateApprovalFlowDto, ApprovalFlowPageQueryDto,
} from './dto/approval-flow.dto';
import { ApprovalService } from './approval.service';
import { ApprovalFlowService } from './approval-flow.service';

@ApiTags('审批中心 Approval')
@Controller('approvals')
export class ApprovalController {
  constructor(
    private readonly svc: ApprovalService,
    private readonly flowSvc: ApprovalFlowService,
  ) {}

  @Post()
  @RequirePermissions('approval:create')
  @ApiOperation({ summary: '发起审批(生成审批任务并入待办中心)' })
  create(@TenantId() t: number, @Body() d: CreateApprovalDto, @CurrentUser() u: AuthUser) {
    return this.svc.create(t, d, u);
  }

  @Get()
  @RequirePermissions('approval:view')
  @ApiOperation({ summary: '审批台账(全量实例)' })
  list(@TenantId() t: number, @Query() q: ApprovalPageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get('todos')
  @RequirePermissions('approval:view')
  @ApiOperation({ summary: '我的审批待办(当前节点审批人=我)' })
  myTodos(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    return this.svc.getMyTodos(t, u.id);
  }

  // ---------------- 审批流模板配置（§4.16 增强） ----------------
  // 注意：子路由须置于 @Get(':id') 之前，否则 /flows 会被 :id 拦截
  @Post('flows')
  @RequirePermissions('approval:create')
  @ApiOperation({ summary: '新建审批流模板(可视化节点/审批人配置)' })
  createFlow(@TenantId() t: number, @Body() d: CreateApprovalFlowDto) {
    return this.flowSvc.create(t, d);
  }

  @Get('flows')
  @RequirePermissions('approval:view')
  @ApiOperation({ summary: '审批流模板列表' })
  listFlows(@TenantId() t: number, @Query() q: ApprovalFlowPageQueryDto) {
    return this.flowSvc.list(t, q);
  }

  @Get('flows/:id')
  @RequirePermissions('approval:view')
  @ApiOperation({ summary: '审批流模板详情' })
  flowDetail(@TenantId() t: number, @Param('id') id: number) {
    return this.flowSvc.detail(t, id);
  }

  @Put('flows/:id')
  @RequirePermissions('approval:update')
  @ApiOperation({ summary: '更新审批流模板(节点/启停)' })
  updateFlow(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateApprovalFlowDto) {
    return this.flowSvc.update(t, id, d);
  }

  @Delete('flows/:id')
  @RequirePermissions('approval:delete')
  @ApiOperation({ summary: '删除审批流模板' })
  removeFlow(@TenantId() t: number, @Param('id') id: number) {
    return this.flowSvc.remove(t, id);
  }

  @Get(':id')
  @RequirePermissions('approval:view')
  @ApiOperation({ summary: '审批详情(含节点)' })
  detail(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.detail(t, id);
  }

  @Post(':id/approve')
  @RequirePermissions('approval:update')
  @ApiOperation({ summary: '通过(当前节点审批人)' })
  approve(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: ApprovalActionDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.approve(t, id, u, d.comment);
  }

  @Post(':id/reject')
  @RequirePermissions('approval:update')
  @ApiOperation({ summary: '驳回(当前节点审批人)' })
  reject(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: ApprovalActionDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.reject(t, id, u, d.comment);
  }
}
