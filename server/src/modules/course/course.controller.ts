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
import { CurrentUser, TenantId } from '../../common/decorators/auth.decorator';
import { AuthUser } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { CourseService } from './course.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseCategoryDto,
  UpdateCourseCategoryDto,
  CreateClassGroupDto,
  UpdateClassGroupDto,
  CreateLessonDto,
  UpdateLessonDto,
  CoursePageQueryDto,
  GenerateLessonsDto,
} from './dto/course.dto';
import { PageQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('课程 Course')
@Controller('courses')
export class CourseController {
  constructor(private readonly svc: CourseService) {}

  // 分类
  @Get('categories')
  @RequirePermissions('course:view')
  @ApiOperation({ summary: '课程分类列表' })
  listCategory(@TenantId() t: number) {
    return this.svc.listCategory(t);
  }

  @Post('categories')
  @RequirePermissions('course:create')
  @OperationLog({ action: 'course:create', target: 'course_category' })
  @ApiOperation({ summary: '新建课程分类' })
  createCategory(@TenantId() t: number, @Body() d: CreateCourseCategoryDto) {
    return this.svc.createCategory(t, d);
  }

  @Put('categories/:id')
  @RequirePermissions('course:update')
  @ApiOperation({ summary: '编辑课程分类' })
  updateCategory(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateCourseCategoryDto) {
    return this.svc.updateCategory(t, id, d);
  }

  @Delete('categories/:id')
  @RequirePermissions('course:delete')
  @ApiOperation({ summary: '删除课程分类' })
  removeCategory(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeCategory(t, id);
  }

  // 课程
  @Get()
  @RequirePermissions('course:view')
  @ApiOperation({ summary: '课程列表(分页)' })
  list(@TenantId() t: number, @Query() q: CoursePageQueryDto) {
    return this.svc.listCourse(t, q);
  }

  @Get(':id')
  @RequirePermissions('course:view')
  @ApiOperation({ summary: '课程详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getCourse(t, id);
  }

  @Post()
  @RequirePermissions('course:create')
  @OperationLog({ action: 'course:create', target: 'course' })
  @ApiOperation({ summary: '新建课程' })
  create(@TenantId() t: number, @Body() d: CreateCourseDto) {
    return this.svc.createCourse(t, d);
  }

  @Put(':id')
  @RequirePermissions('course:update')
  @OperationLog({ action: 'course:update', target: 'course' })
  @ApiOperation({ summary: '编辑课程' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateCourseDto) {
    return this.svc.updateCourse(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('course:delete')
  @OperationLog({ action: 'course:delete', target: 'course' })
  @ApiOperation({ summary: '删除课程' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeCourse(t, id);
  }

  // 班级
  @Get('class-groups/list')
  @RequirePermissions('class-group:view')
  @ApiOperation({ summary: '班级列表' })
  listClass(@TenantId() t: number, @Query() q: PageQueryDto, @Query('courseId') courseId?: number) {
    return this.svc.listClassGroup(t, q, courseId ? Number(courseId) : undefined);
  }

  @Get('class-groups/:id')
  @RequirePermissions('class-group:view')
  @ApiOperation({ summary: '班级详情' })
  getClass(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getClassGroup(t, id);
  }

  @Post('class-groups')
  @RequirePermissions('class-group:create')
  @OperationLog({ action: 'class-group:create', target: 'class_group' })
  @ApiOperation({ summary: '开班/新建班级' })
  createClass(@TenantId() t: number, @Body() d: CreateClassGroupDto) {
    return this.svc.createClassGroup(t, d);
  }

  @Put('class-groups/:id')
  @RequirePermissions('class-group:update')
  @ApiOperation({ summary: '编辑班级' })
  updateClass(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateClassGroupDto) {
    return this.svc.updateClassGroup(t, id, d);
  }

  @Delete('class-groups/:id')
  @RequirePermissions('class-group:delete')
  @ApiOperation({ summary: '删除班级' })
  removeClass(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeClassGroup(t, id);
  }

  // 课次 / 排课
  @Get('lessons/list')
  @RequirePermissions('lesson:view')
  @ApiOperation({ summary: '课次列表' })
  listLesson(@TenantId() t: number, @Query() q: PageQueryDto, @Query('classGroupId') classGroupId?: number) {
    return this.svc.listLesson(t, q, classGroupId ? Number(classGroupId) : undefined);
  }

  @Post('lessons')
  @RequirePermissions('lesson:create')
  @OperationLog({ action: 'lesson:create', target: 'lesson' })
  @ApiOperation({ summary: '排课(含冲突检测 §8.5)' })
  createLesson(@CurrentUser() u: AuthUser, @TenantId() t: number, @Body() d: CreateLessonDto) {
    void u;
    return this.svc.createLesson(t, d);
  }

  @Post('lessons/generate')
  @RequirePermissions('lesson:create')
  @OperationLog({ action: 'lesson:generate', target: 'lesson' })
  @ApiOperation({ summary: '按周批量生成课次(含冲突检测 §8.5)' })
  generateLessons(@TenantId() t: number, @Body() d: GenerateLessonsDto) {
    return this.svc.generateLessons(t, d);
  }

  @Put('lessons/:id')
  @RequirePermissions('lesson:update')
  @ApiOperation({ summary: '调课' })
  updateLesson(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateLessonDto) {
    return this.svc.updateLesson(t, id, d);
  }

  @Delete('lessons/:id')
  @RequirePermissions('lesson:delete')
  @ApiOperation({ summary: '删除课次' })
  removeLesson(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeLesson(t, id);
  }
}
