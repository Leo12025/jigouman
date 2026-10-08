import {
  Controller, Post, Get, Put, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  CreateHomeworkDto, HomeworkPageQueryDto, SubmitHomeworkDto, ReviewHomeworkDto, SubmitPageQueryDto,
} from './dto/homework.dto';
import { HomeworkService } from './homework.service';
import { StudentParent } from '../student/entities/student-parent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('作业 Homework')
@Controller('homework')
export class HomeworkController {
  constructor(
    private readonly svc: HomeworkService,
    @InjectRepository(StudentParent)
    private readonly spRepo: Repository<StudentParent>,
  ) {}

  @Post()
  @RequirePermissions('homework:create')
  @OperationLog({ action: 'homework:create', target: 'homework' })
  @ApiOperation({ summary: '布置作业(按课次/班级，支持文字/图片/音频/附件)' })
  create(@TenantId() t: number, @Body() d: CreateHomeworkDto, @CurrentUser() u: AuthUser) {
    return this.svc.create(t, d, u.id);
  }

  @Get()
  @RequirePermissions('homework:view')
  @ApiOperation({ summary: '作业列表' })
  list(@TenantId() t: number, @Query() q: HomeworkPageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('homework:view')
  @ApiOperation({ summary: '作业详情(含提交与批改)' })
  detail(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.detail(t, id);
  }

  /**
   * 提交作业（§6.4）。老师代提交或家长端提交均走此接口：
   * 家长身份时校验学员已绑定在该家长名下，防止越权代交。
   */
  @Post(':id/submit')
  @OperationLog({ action: 'homework:submit', target: 'homework_submit' })
  @ApiOperation({ summary: '提交作业(家长/学员端，支持拍照/录音/文件)' })
  async submit(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: SubmitHomeworkDto,
    @CurrentUser() u: AuthUser,
  ) {
    if (u.kind === 'parent') {
      await this.assertParentBound(t, u, d.studentId);
    }
    return this.svc.submit(t, id, d);
  }

  @Post('submit/:sid/review')
  @RequirePermissions('homework:update')
  @OperationLog({ action: 'homework:review', target: 'homework_review' })
  @ApiOperation({ summary: '批改作业(打分/评语/标注错误/标记优秀)' })
  review(
    @TenantId() t: number,
    @Param('sid') sid: number,
    @Body() d: ReviewHomeworkDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.review(t, Number(sid), d, u.id);
  }

  @Get('submits/list')
  @RequirePermissions('homework:view')
  @ApiOperation({ summary: '提交记录列表' })
  submits(@TenantId() t: number, @Query() q: SubmitPageQueryDto) {
    return this.svc.listSubmits(t, q);
  }

  @Get(':id/stats')
  @RequirePermissions('homework:view')
  @ApiOperation({ summary: '作业统计(提交率/优秀率/按时率)' })
  stats(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.stats(t, id);
  }

  @Get(':id/unsubmitted')
  @RequirePermissions('homework:view')
  @ApiOperation({ summary: '未提交名单(用于提醒)' })
  unsubmitted(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.unsubmitted(t, id);
  }

  /** 家长只能为已绑定的学员提交作业 */
  private async assertParentBound(tenantId: number, u: AuthUser, studentId: number) {
    const rows = await this.spRepo.find({
      where: { tenantId, phone: u.phone } as any,
    });
    const bound = rows.filter(
      (r) => Number(r.studentId) === Number(studentId) && !r.unboundAt,
    );
    if (!bound.length) throw new ForbiddenException('该学员未绑定在当前家长账号下');
  }
}
