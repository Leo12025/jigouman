import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { CreateCourseReviewDto, ReviewPageQueryDto } from './dto/family.dto';
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
