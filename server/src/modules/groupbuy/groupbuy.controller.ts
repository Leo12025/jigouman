import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { GroupBuyService } from './groupbuy.service';
import { CreateGroupBuyActivityDto, UpdateGroupBuyActivityDto, CreateTeamDto, JoinTeamDto, GroupBuyPageQueryDto } from './dto/groupbuy.dto';

@ApiTags('团购拼团 GroupBuy')
@Controller('group-buy')
export class GroupBuyController {
  constructor(private readonly svc: GroupBuyService) {}

  @Post('activities')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '新建拼团活动' })
  createAct(@TenantId() t: number, @Body() d: CreateGroupBuyActivityDto) { return this.svc.createActivity(t, d); }
  @Get('activities')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '拼团活动列表' })
  listAct(@TenantId() t: number, @Query() q: GroupBuyPageQueryDto) { return this.svc.listActivities(t, q); }
  @Get('activities/:id')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '活动详情' })
  getAct(@TenantId() t: number, @Param('id') id: string) { return this.svc.getActivity(t, Number(id)); }
  @Put('activities/:id')
  @RequirePermissions('groupbuy:update')
  @ApiOperation({ summary: '更新活动' })
  updateAct(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateGroupBuyActivityDto) { return this.svc.updateActivity(t, Number(id), d); }
  @Delete('activities/:id')
  @RequirePermissions('groupbuy:delete')
  @ApiOperation({ summary: '删除活动(软删)' })
  removeAct(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeActivity(t, Number(id)); }

  @Post('teams')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '开团' })
  createTeam(@TenantId() t: number, @Body() d: CreateTeamDto) { return this.svc.createTeam(t, d); }
  @Post('teams/join')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '参团(满员自动成团)' })
  joinTeam(@TenantId() t: number, @Body() d: JoinTeamDto) { return this.svc.joinTeam(t, d); }
  @Get('teams')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '拼团列表' })
  listTeams(@TenantId() t: number, @Query('activityId') activityId: string) { return this.svc.listTeams(t, Number(activityId)); }
  @Post('redeem')
  @RequirePermissions('groupbuy:update')
  @ApiOperation({ summary: '核销(须已成团)' })
  redeem(@TenantId() t: number, @Body() d: { code: string }) { return this.svc.redeem(t, d.code); }
}
