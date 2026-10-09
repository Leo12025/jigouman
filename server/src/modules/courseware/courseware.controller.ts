import {
  Controller, Post, Get, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  CreateStageDto, UpdateStageDto, CreateCoursewareDto, UpdateCoursewareDto,
  CoursewarePageQueryDto,
} from './dto/courseware.dto';
import { CoursewareService } from './courseware.service';

@ApiTags('课件管理 Courseware')
@Controller()
export class CoursewareController {
  constructor(private readonly svc: CoursewareService) {}

  // 阶段（挂在课程下）
  @Post('courses/:courseId/stages')
  @RequirePermissions('courseware:create')
  @OperationLog({ action: 'courseware:create-stage', target: 'course_stage' })
  @ApiOperation({ summary: '新建阶段(可附大纲文件)' })
  createStage(@TenantId() t: number, @Param('courseId') courseId: number, @Body() d: CreateStageDto) {
    return this.svc.createStage(t, Number(courseId), d);
  }

  @Get('courses/:courseId/stages')
  @RequirePermissions('courseware:view')
  @ApiOperation({ summary: '课程阶段树(含课件)' })
  tree(@TenantId() t: number, @Param('courseId') courseId: number) {
    return this.svc.tree(t, Number(courseId));
  }

  @Put('stages/:id')
  @RequirePermissions('courseware:update')
  @OperationLog({ action: 'courseware:update-stage', target: 'course_stage' })
  @ApiOperation({ summary: '编辑阶段' })
  updateStage(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateStageDto) {
    return this.svc.updateStage(t, Number(id), d);
  }

  @Delete('stages/:id')
  @RequirePermissions('courseware:delete')
  @OperationLog({ action: 'courseware:delete-stage', target: 'course_stage' })
  @ApiOperation({ summary: '删除阶段(级联删除课件)' })
  removeStage(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeStage(t, Number(id));
  }

  // 课件（挂在阶段下）
  @Post('stages/:stageId/coursewares')
  @RequirePermissions('courseware:create')
  @OperationLog({ action: 'courseware:create-courseware', target: 'courseware' })
  @ApiOperation({ summary: '新建课时课件(PPT/资源包)' })
  createCourseware(@TenantId() t: number, @Param('stageId') stageId: number, @Body() d: CreateCoursewareDto) {
    return this.svc.createCourseware(t, Number(stageId), d);
  }

  @Get('stages/:stageId/coursewares')
  @RequirePermissions('courseware:view')
  @ApiOperation({ summary: '阶段下课件列表' })
  listByStage(@TenantId() t: number, @Param('stageId') stageId: number, @Query() q: CoursewarePageQueryDto) {
    return this.svc.listCoursewares(t, { ...q, stageId: Number(stageId) });
  }

  @Get('courses/:courseId/coursewares')
  @RequirePermissions('courseware:view')
  @ApiOperation({ summary: '课程下全部课件' })
  listByCourse(@TenantId() t: number, @Param('courseId') courseId: number, @Query() q: CoursewarePageQueryDto) {
    return this.svc.listCoursewares(t, { ...q, courseId: Number(courseId) });
  }

  @Put('coursewares/:id')
  @RequirePermissions('courseware:update')
  @OperationLog({ action: 'courseware:update-courseware', target: 'courseware' })
  @ApiOperation({ summary: '编辑课件' })
  updateCourseware(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateCoursewareDto) {
    return this.svc.updateCourseware(t, Number(id), d);
  }

  @Delete('coursewares/:id')
  @RequirePermissions('courseware:delete')
  @OperationLog({ action: 'courseware:delete-courseware', target: 'courseware' })
  @ApiOperation({ summary: '删除课件' })
  removeCourseware(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeCourseware(t, Number(id));
  }
}
