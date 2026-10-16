import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { CreateCourseReviewDto, ReviewPageQueryDto } from './dto/family.dto';
import { CreateNoticeDto, NoticePageQueryDto, CreateRenewalReminderDto } from './dto/notice.dto';
import { FamilyService } from './family.service';

@ApiTags('家校服务 Family')
@Controller('course-reviews')
export class FamilyController {
  constructor(private readonly svc: FamilyService) {}

  @Post()
  @RequirePermissions('review:create')
  @OperationLog({ action: 'review:create', target: 'course_review' })
  @ApiOperation({ summary: '撰写课后点评(写完自动完成点评待办)' })
  create(@TenantId() t: number, @Body() d: CreateCourseReviewDto, @CurrentUser() u: AuthUser) {
    return this.svc.createReview(t, d, u.id);
  }

  @Post('draft')
  @RequirePermissions('review:create')
  @ApiOperation({ summary: 'AI 生成课后点评草稿(需人工复核后正式提交)' })
  draft(@TenantId() t: number, @Body() d: any) {
    return this.svc.draftReview(t, { studentId: Number(d.studentId), classGroupId: d.classGroupId ? Number(d.classGroupId) : undefined, lessonId: d.lessonId ? Number(d.lessonId) : undefined });
  }
}

@ApiTags('家校服务 Family')
@Controller('notices')
export class NoticeController {
  constructor(private readonly svc: FamilyService) {}

  @Post()
  @RequirePermissions('review:create')
  @OperationLog({ action: 'notice:create', target: 'notice' })
  @ApiOperation({ summary: '发送通知(§6.6)' })
  create(@TenantId() t: number, @Body() d: CreateNoticeDto) {
    return this.svc.createNotice(t, d);
  }

  @Get()
  @RequirePermissions('review:view')
  @ApiOperation({ summary: '通知列表' })
  list(@TenantId() t: number, @Query() q: NoticePageQueryDto) {
    return this.svc.listNotices(t, q);
  }
}

@ApiTags('家校服务 Family')
@Controller('renewal-reminders')
export class RenewalController {
  constructor(private readonly svc: FamilyService) {}

  @Post()
  @RequirePermissions('review:create')
  @OperationLog({ action: 'renewal:create', target: 'renewal_reminder' })
  @ApiOperation({ summary: '触发续费提醒(§6.6)' })
  create(@TenantId() t: number, @Body() d: CreateRenewalReminderDto) {
    return this.svc.createRenewalReminder(t, d);
  }

  @Get()
  @RequirePermissions('review:view')
  @ApiOperation({ summary: '续费提醒列表' })
  list(@TenantId() t: number, @Query('studentId') studentId?: number) {
    return this.svc.listRenewals(t, studentId ? Number(studentId) : undefined);
  }
}

@ApiTags('家校服务 Family')
@Controller('students')
export class StudentReviewController {
  constructor(private readonly svc: FamilyService) {}

  @Get(':id/reviews')
  @RequirePermissions('review:view')
  @ApiOperation({ summary: '学员课后点评列表' })
  reviews(@TenantId() t: number, @Param('id') id: number, @Query() q: ReviewPageQueryDto) {
    return this.svc.listByStudent(t, Number(id), q);
  }
}
