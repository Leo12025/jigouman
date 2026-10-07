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
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { StudentService } from './student.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  BindParentDto,
  UnbindParentDto,
  EnrollCourseDto,
  StudentPageQueryDto,
} from './dto/student.dto';

@ApiTags('学员 Student')
@Controller('students')
export class StudentController {
  constructor(private readonly svc: StudentService) {}

  @Get()
  @RequirePermissions('student:view')
  @ApiOperation({ summary: '学员列表(分页)' })
  list(@TenantId() t: number, @Query() q: StudentPageQueryDto) {
    return this.svc.listStudent(t, q);
  }

  @Get(':id')
  @RequirePermissions('student:view')
  @ApiOperation({ summary: '学员详情(含报名/家长)' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.getStudent(t, id);
  }

  @Post()
  @RequirePermissions('student:create')
  @OperationLog({ action: 'student:create', target: 'student' })
  @ApiOperation({ summary: '新建学员' })
  create(@TenantId() t: number, @Body() d: CreateStudentDto) {
    return this.svc.createStudent(t, d);
  }

  @Put(':id')
  @RequirePermissions('student:update')
  @OperationLog({ action: 'student:update', target: 'student' })
  @ApiOperation({ summary: '编辑学员' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateStudentDto) {
    return this.svc.updateStudent(t, id, d);
  }

  @Delete(':id')
  @RequirePermissions('student:delete')
  @OperationLog({ action: 'student:delete', target: 'student' })
  @ApiOperation({ summary: '删除学员' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.removeStudent(t, id);
  }

  // 家长多对多绑定（§4.4 / §8.14）
  @Get(':id/parents')
  @RequirePermissions('student:view')
  @ApiOperation({ summary: '学员家长列表' })
  parents(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listParents(t, id);
  }

  @Post('parents/bind')
  @RequirePermissions('student:update')
  @OperationLog({ action: 'student:update', target: 'student_parent' })
  @ApiOperation({ summary: '绑定家长(多对多)' })
  bind(@TenantId() t: number, @Body() d: BindParentDto) {
    return this.svc.bindParent(t, d);
  }

  @Post('parents/unbind')
  @RequirePermissions('student:update')
  @OperationLog({ action: 'student:update', target: 'student_parent' })
  @ApiOperation({ summary: '解绑家长(保留历史)' })
  unbind(@TenantId() t: number, @Body() d: UnbindParentDto) {
    return this.svc.unbindParent(t, d);
  }

  // 报名课程
  @Get(':id/courses')
  @RequirePermissions('student:view')
  @ApiOperation({ summary: '学员报名课程' })
  courses(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listEnroll(t, id);
  }

  @Post('courses/enroll')
  @RequirePermissions('student:create')
  @OperationLog({ action: 'student:create', target: 'student_course' })
  @ApiOperation({ summary: '报名课程' })
  enroll(@TenantId() t: number, @Body() d: EnrollCourseDto) {
    return this.svc.enrollCourse(t, d);
  }
}
