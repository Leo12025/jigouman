import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  CreateExamDto, CreateScoreDto, CreateGrowthMetricDto, CreateContestDto, JoinContestDto, AwardDto,
} from './dto/growth.dto';
import { GrowthService } from './growth.service';

@ApiTags('学员成长 Growth')
@Controller()
export class GrowthController {
  constructor(private readonly svc: GrowthService) {}

  @Post('exams')
  @RequirePermissions('growth:create')
  @OperationLog({ action: 'growth:create', target: 'exam' })
  @ApiOperation({ summary: '创建测评(§6.5，自动生成成绩录入待办)' })
  createExam(@TenantId() t: number, @Body() d: CreateExamDto, @CurrentUser() u: AuthUser) {
    return this.svc.createExam(t, d, u.id);
  }

  @Get('exams')
  @RequirePermissions('growth:view')
  @ApiOperation({ summary: '测评列表' })
  listExams(@TenantId() t: number) {
    return this.svc.listExams(t);
  }

  @Post('scores')
  @RequirePermissions('growth:create')
  @OperationLog({ action: 'growth:create', target: 'score' })
  @ApiOperation({ summary: '录入成绩(老师端 H5/PC 共用，§6.5)' })
  createScore(@TenantId() t: number, @Body() d: CreateScoreDto, @CurrentUser() u: AuthUser) {
    return this.svc.createScore(t, d, u.id);
  }

  @Post('growth-metrics')
  @RequirePermissions('growth:create')
  @OperationLog({ action: 'growth:create', target: 'growth_metric' })
  @ApiOperation({ summary: '素养评价打分(§4.8)' })
  createMetric(@TenantId() t: number, @Body() d: CreateGrowthMetricDto, @CurrentUser() u: AuthUser) {
    return this.svc.createMetric(t, d, u.id);
  }

  @Post('contests')
  @RequirePermissions('growth:create')
  @ApiOperation({ summary: '创建赛事(§6.5)' })
  createContest(@TenantId() t: number, @Body() d: CreateContestDto) {
    return this.svc.createContest(t, d);
  }

  @Get('contests')
  @RequirePermissions('growth:view')
  @ApiOperation({ summary: '赛事列表' })
  listContests(@TenantId() t: number) {
    return this.svc.listContests(t);
  }

  @Post('contests/:id/join')
  @RequirePermissions('growth:create')
  @OperationLog({ action: 'growth:join', target: 'contest_join' })
  @ApiOperation({ summary: '报名参赛(§6.5)' })
  join(@TenantId() t: number, @Param('id') id: number, @Body() d: JoinContestDto) {
    return this.svc.joinContest(t, Number(id), d);
  }

  @Post('contests/join/:jid/award')
  @RequirePermissions('growth:update')
  @OperationLog({ action: 'growth:award', target: 'award' })
  @ApiOperation({ summary: '登记获奖(§6.5)' })
  award(@TenantId() t: number, @Param('jid') jid: number, @Body() d: AwardDto) {
    return this.svc.addAward(t, Number(jid), d);
  }
}

@ApiTags('学员成长 Growth')
@Controller('students')
export class StudentGrowthController {
  constructor(private readonly svc: GrowthService) {}

  @Get(':id/scores')
  @RequirePermissions('growth:view')
  @ApiOperation({ summary: '成绩趋势(可按课程过滤，§6.5)' })
  scores(@TenantId() t: number, @Param('id') id: number, @Query('course') course?: number) {
    return this.svc.scoreTrend(t, Number(id), course ? Number(course) : undefined);
  }

  @Get(':id/metrics')
  @RequirePermissions('growth:view')
  @ApiOperation({ summary: '素养评价列表(§4.8)' })
  metrics(@TenantId() t: number, @Param('id') id: number, @Query('period') period?: string) {
    return this.svc.listMetrics(t, Number(id), period);
  }

  @Get(':id/growth')
  @RequirePermissions('growth:view')
  @ApiOperation({ summary: '成长档案时间轴(成绩+素养+参赛+获奖，§6.5)' })
  growth(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.growthTimeline(t, Number(id));
  }
}
