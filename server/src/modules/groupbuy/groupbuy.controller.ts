import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { GroupBuyService } from './groupbuy.service';
import {
  CreateGroupBuyActivityDto, UpdateGroupBuyActivityDto, CreateTeamDto, JoinTeamDto,
  GroupBuyPageQueryDto, SetGroupBuyTiersDto, CreateShowoffDto, CreateSquadDto,
  TrackEventDto, CreateMaterialDto, RedeemDto,
} from './dto/groupbuy.dto';

@ApiTags('团购拼团 GroupBuy')
@Controller('group-buy')
export class GroupBuyController {
  constructor(private readonly svc: GroupBuyService) {}

  // ---------------- 活动 ----------------
  @Post('activities')
  @RequirePermissions('groupbuy:create')
  @OperationLog({ action: 'groupbuy:create-activity', target: 'group_buy_activities' })
  @ApiOperation({ summary: '新建拼团活动（含阶梯/团长优惠/模拟成团/新老客/佣金配置）' })
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
  @OperationLog({ action: 'groupbuy:update-activity', target: 'group_buy_activities' })
  @ApiOperation({ summary: '更新活动' })
  updateAct(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateGroupBuyActivityDto) {
    return this.svc.updateActivity(t, Number(id), d);
  }

  @Delete('activities/:id')
  @RequirePermissions('groupbuy:delete')
  @OperationLog({ action: 'groupbuy:delete-activity', target: 'group_buy_activities' })
  @ApiOperation({ summary: '删除活动(软删)' })
  removeAct(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeActivity(t, Number(id)); }

  // ---------------- 阶梯团 ----------------
  @Post('activities/:id/tiers')
  @RequirePermissions('groupbuy:update')
  @OperationLog({ action: 'groupbuy:set-tiers', target: 'group_buy_tiers' })
  @ApiOperation({ summary: '设置阶梯团档位(人数越多价越低,建议3~5档)' })
  setTiers(@TenantId() t: number, @Param('id') id: string, @Body() d: SetGroupBuyTiersDto) {
    return this.svc.setTiers(t, Number(id), d);
  }

  @Get('activities/:id/tiers')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '阶梯档位列表' })
  listTiers(@TenantId() t: number, @Param('id') id: string) { return this.svc.listTiers(t, Number(id)); }

  // ---------------- 凑团 ----------------
  @Get('activities/:id/open-teams')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '凑团列表(未成团且未过期,含还差几人,按差额升序)' })
  openTeams(
    @TenantId() t: number,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listOpenTeams(t, Number(id), Number(limit) || 10);
  }

  // ---------------- 开团 / 参团 / 核销 ----------------
  @Post('teams')
  @RequirePermissions('groupbuy:create')
  @OperationLog({ action: 'groupbuy:create-team', target: 'group_buy_teams' })
  @ApiOperation({ summary: '开团(团长享专属价,自动生成待支付订单)' })
  createTeam(@TenantId() t: number, @Body() d: CreateTeamDto) { return this.svc.createTeam(t, d); }

  @Post('teams/join')
  @RequirePermissions('groupbuy:create')
  @OperationLog({ action: 'groupbuy:join-team', target: 'group_buy_teams' })
  @ApiOperation({ summary: '参团(原子占位,满员成团,自动生成待支付订单)' })
  joinTeam(@TenantId() t: number, @Body() d: JoinTeamDto) { return this.svc.joinTeam(t, d); }

  @Get('teams')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '拼团列表' })
  listTeams(@TenantId() t: number, @Query('activityId') activityId: string) {
    return this.svc.listTeams(t, Number(activityId));
  }

  @Get('teams/:id/members')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '拼团成员(含各自订单与应付价)' })
  members(@TenantId() t: number, @Param('id') id: string) { return this.svc.listMembers(t, Number(id)); }

  @Post('redeem')
  @RequirePermissions('groupbuy:update')
  @OperationLog({ action: 'groupbuy:redeem', target: 'group_buy_teams' })
  @ApiOperation({ summary: '核销(落库防重复,记录核销人与时间)' })
  redeem(@TenantId() t: number, @Body() d: RedeemDto, @CurrentUser() u: AuthUser) {
    return this.svc.redeem(t, d, u.id);
  }

  // ---------------- 过程数据 / 员工榜 ----------------
  @Post('events/track')
  @ApiOperation({ summary: '活动过程埋点上报(访问/分享/参团/成团/核销,支持匿名访客)' })
  track(@TenantId() t: number, @Body() d: TrackEventDto) { return this.svc.trackPublic(t, d); }

  @Get('activities/:id/funnel')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '活动转化漏斗(访问/分享/参团/成团/核销)' })
  funnel(@TenantId() t: number, @Param('id') id: string) { return this.svc.funnel(t, Number(id)); }

  @Get('activities/:id/staff-ranking')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '员工榜(按成团数+参团数排名,含所属战队)' })
  staffRanking(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.staffRanking(t, Number(id));
  }

  // ---------------- 晒单 / 战队 / 物料 ----------------
  @Post('showoffs')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '发布晒单(买家秀,打通购买→晒单→二次传播)' })
  createShowoff(@TenantId() t: number, @Body() d: CreateShowoffDto) { return this.svc.createShowoff(t, d); }

  @Get('showoffs')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '晒单列表' })
  listShowoffs(
    @TenantId() t: number,
    @Query('activityId') activityId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.svc.listShowoffs(t, activityId ? Number(activityId) : undefined, teamId ? Number(teamId) : undefined);
  }

  @Post('squads')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '创建战队(员工分组PK)' })
  createSquad(@TenantId() t: number, @Body() d: CreateSquadDto) { return this.svc.createSquad(t, d); }

  @Get('squads')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '战队列表' })
  listSquads(@TenantId() t: number, @Query('activityId') activityId?: string) {
    return this.svc.listSquads(t, activityId ? Number(activityId) : undefined);
  }

  @Post('materials')
  @RequirePermissions('groupbuy:create')
  @ApiOperation({ summary: '新增营销物料(海报/传单/图文/邀请函)' })
  createMaterial(@TenantId() t: number, @Body() d: CreateMaterialDto) { return this.svc.createMaterial(t, d); }

  @Get('materials')
  @RequirePermissions('groupbuy:view')
  @ApiOperation({ summary: '营销物料库(可按场景/类型检索,支持可打印筛选)' })
  listMaterials(
    @TenantId() t: number,
    @Query('scene') scene?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.listMaterials(t, scene, type);
  }
}
