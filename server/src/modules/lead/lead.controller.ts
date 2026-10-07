import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId, AuthUser } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { LeadService } from './lead.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateLeadDto,
  UpdateLeadDto,
  LeadPageQueryDto,
  AssignLeadDto,
  FollowLeadDto,
  ConvertLeadDto,
  TrialLessonDto,
  FunnelQueryDto,
} from './dto/lead.dto';

// ---------- 渠道 ----------
@ApiTags('招生-渠道 Channel')
@Controller('channels')
export class ChannelController {
  constructor(private readonly svc: LeadService) {}

  @Get()
  @RequirePermissions('channel:view')
  @ApiOperation({ summary: '渠道列表' })
  list(@TenantId() t: number) {
    return this.svc.listChannel(t);
  }

  @Post()
  @RequirePermissions('channel:create')
  @OperationLog({ action: 'channel:create', target: 'channel' })
  @ApiOperation({ summary: '新建渠道' })
  create(@TenantId() t: number, @Body() d: CreateChannelDto) {
    return this.svc.createChannel(t, d);
  }

  @Put(':id')
  @RequirePermissions('channel:update')
  @ApiOperation({ summary: '编辑渠道' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateChannelDto) {
    return this.svc.updateChannel(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('channel:delete')
  @ApiOperation({ summary: '删除渠道' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeChannel(t, id);
  }
}

// ---------- 市场活动 ----------
@ApiTags('招生-活动 Campaign')
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly svc: LeadService) {}

  @Get()
  @RequirePermissions('campaign:view')
  @ApiOperation({ summary: '活动列表' })
  list(@TenantId() t: number) {
    return this.svc.listCampaign(t);
  }

  @Post()
  @RequirePermissions('campaign:create')
  @OperationLog({ action: 'campaign:create', target: 'campaign' })
  @ApiOperation({ summary: '新建活动' })
  create(@TenantId() t: number, @Body() d: CreateCampaignDto) {
    return this.svc.createCampaign(t, d);
  }

  @Put(':id')
  @RequirePermissions('campaign:update')
  @ApiOperation({ summary: '编辑活动' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateCampaignDto) {
    return this.svc.updateCampaign(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('campaign:delete')
  @ApiOperation({ summary: '删除活动' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeCampaign(t, id);
  }
}

// ---------- 线索 CRM ----------
@ApiTags('线索 CRM')
@Controller('leads')
export class LeadController {
  constructor(private readonly svc: LeadService) {}

  @Get('funnel')
  @RequirePermissions('lead:view')
  @ApiOperation({ summary: '转化漏斗(§4.2)：各阶段数量/转化率' })
  funnel(@TenantId() t: number, @Query() q: FunnelQueryDto) {
    return this.svc.funnel(t, q);
  }

  @Get()
  @RequirePermissions('lead:view')
  @ApiOperation({ summary: '线索列表(分页)' })
  list(@TenantId() t: number, @Query() q: LeadPageQueryDto) {
    return this.svc.listLead(t, q);
  }

  @Get(':id')
  @RequirePermissions('lead:view')
  @ApiOperation({ summary: '线索详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getLead(t, id);
  }

  @Post()
  @RequirePermissions('lead:create')
  @OperationLog({ action: 'lead:create', target: 'lead' })
  @ApiOperation({ summary: '新建线索' })
  create(@TenantId() t: number, @Body() d: CreateLeadDto) {
    return this.svc.createLead(t, d);
  }

  @Put(':id')
  @RequirePermissions('lead:update')
  @OperationLog({ action: 'lead:update', target: 'lead' })
  @ApiOperation({ summary: '编辑线索' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateLeadDto) {
    return this.svc.updateLead(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('lead:delete')
  @OperationLog({ action: 'lead:delete', target: 'lead' })
  @ApiOperation({ summary: '删除线索' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeLead(t, id);
  }

  @Post(':id/assign')
  @RequirePermissions('lead:assign')
  @ApiOperation({ summary: '分配线索给顾问' })
  assign(@TenantId() t: number, @Param('id') id: number, @Body() d: AssignLeadDto) {
    return this.svc.assignLead(t, id, d.ownerId);
  }

  @Post(':id/follow')
  @RequirePermissions('lead:follow')
  @ApiOperation({ summary: '跟进线索(写跟进记录)' })
  follow(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: FollowLeadDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.followLead(t, id, d, u.id);
  }

  @Post(':id/convert')
  @RequirePermissions('lead:convert')
  @OperationLog({ action: 'lead:convert', target: 'lead' })
  @ApiOperation({ summary: '转化为学员(打通 CRM→学员, §4.3)' })
  convert(@TenantId() t: number, @Param('id') id: number, @Body() d: ConvertLeadDto) {
    return this.svc.convertLead(t, id, d);
  }

  @Post(':id/trials')
  @RequirePermissions('lead:update')
  @ApiOperation({ summary: '安排/记录试听' })
  createTrial(@TenantId() t: number, @Param('id') id: number, @Body() d: TrialLessonDto) {
    return this.svc.createTrial(t, id, d);
  }

  @Get(':id/trials')
  @RequirePermissions('lead:view')
  @ApiOperation({ summary: '试听记录' })
  listTrial(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listTrial(t, id);
  }

  @Get(':id/follows')
  @RequirePermissions('lead:view')
  @ApiOperation({ summary: '跟进记录时间线' })
  listFollow(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listFollow(t, id);
  }
}
