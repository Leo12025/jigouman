import {
  Body, Controller, Get, Param, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../../common/decorators/auth.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { GroupBuyService } from './groupbuy.service';
import { GroupBuyActivity } from './entities/group-buy-activity.entity';
import { GroupBuyTeam } from './entities/group-buy-team.entity';
import {
  CreateTeamDto, JoinTeamDto, CreateShowoffDto,
} from './dto/groupbuy.dto';

/**
 * 团购拼团 C 端（消费者 H5）公开接口（对照竞品「商家岛」裂变闭环）。
 * 无需登录，租户由活动/拼团实体推导（兼容单租户部署的 DEFAULT_TENANT_ID）。
 * 仅暴露「浏览/开团/参团/凑团/我的拼团/晒单/分享埋点」等消费者动作，
 * 运营配置（活动增删改、阶梯、核销、战队、物料、漏斗）仍在受权限保护的 GroupBuyController。
 */
@ApiTags('团购拼团 C端(H5 Public)')
@Controller('group-buy-public')
export class GroupBuyPublicController {
  constructor(
    private readonly svc: GroupBuyService,
    @InjectRepository(GroupBuyActivity) private readonly actRaw: Repository<GroupBuyActivity>,
    @InjectRepository(GroupBuyTeam) private readonly teamRaw: Repository<GroupBuyTeam>,
  ) {}

  private defaultTenant(): number {
    return Number(process.env.DEFAULT_TENANT_ID) || 0;
  }

  private async tenantOfActivity(activityId: number): Promise<number> {
    const a = await this.actRaw.findOne({ where: { id: activityId } as any });
    if (!a) throw new BusinessException(ResCode.BAD_REQUEST, '活动不存在');
    return a.tenantId;
  }

  private async tenantOfTeam(id: number): Promise<number> {
    const t = await this.teamRaw.findOne({ where: { id } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    return t.tenantId;
  }

  private async tenantOfTeamByCode(code: string): Promise<number> {
    const t = await this.teamRaw.findOne({ where: { code } as any });
    if (!t) throw new BusinessException(ResCode.BAD_REQUEST, '拼团不存在');
    return t.tenantId;
  }

  @Public()
  @Get('activities')
  @ApiOperation({ summary: 'C端：在售拼团活动列表(ACTIVE)' })
  listAct(@Query('tenantId') tenantId?: string) {
    return this.svc.listActivities(Number(tenantId) || this.defaultTenant(), {
      status: 'ACTIVE', page: 1, size: 100,
    } as any);
  }

  @Public()
  @Get('activities/:id')
  @ApiOperation({ summary: 'C端：活动详情(含阶梯档位)' })
  async getAct(@Param('id') id: string) {
    const tid = await this.tenantOfActivity(Number(id));
    const a = await this.svc.getActivity(tid, Number(id));
    const tiers = await this.svc.listTiers(tid, Number(id));
    return { ...(a as any), tiers };
  }

  @Public()
  @Get('activities/:id/open-teams')
  @ApiOperation({ summary: 'C端：凑团列表(未成团且未过期,含还差几人)' })
  async openTeams(@Param('id') id: string, @Query('limit') limit?: string) {
    const tid = await this.tenantOfActivity(Number(id));
    return this.svc.listOpenTeams(tid, Number(id), Number(limit) || 10);
  }

  @Public()
  @Get('teams/:id/members')
  @ApiOperation({ summary: 'C端：拼团成员(含各自订单与应付价)' })
  async members(@Param('id') id: string) {
    const tid = await this.tenantOfTeam(Number(id));
    return this.svc.listMembers(tid, Number(id));
  }

  @Public()
  @Post('teams')
  @ApiOperation({ summary: 'C端：开团(团长,自动生成待支付订单)' })
  async createTeam(@Body() d: CreateTeamDto) {
    const tid = await this.tenantOfActivity(d.activityId);
    return this.svc.createTeam(tid, d);
  }

  @Public()
  @Post('teams/join')
  @ApiOperation({ summary: 'C端：参团(按拼团码,原子占位满员成团)' })
  async joinTeam(@Body() d: JoinTeamDto) {
    const tid = await this.tenantOfTeamByCode(d.code);
    return this.svc.joinTeam(tid, d);
  }

  @Public()
  @Post('showoffs')
  @ApiOperation({ summary: 'C端：发布晒单(买家秀)' })
  async createShowoff(@Body() d: CreateShowoffDto) {
    const tid = await this.tenantOfTeam(d.teamId);
    return this.svc.createShowoff(tid, d);
  }

  @Public()
  @Get('teams/mine')
  @ApiOperation({ summary: 'C端：我的拼团(按学员ID查参与的团)' })
  async mine(@Query('studentId') studentId?: string) {
    if (!studentId) return [];
    return this.svc.myTeams(Number(studentId));
  }
}
