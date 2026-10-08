import {
  Controller, Post, Get, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { CreateTaskDto, TaskPageQueryDto } from './dto/task.dto';
import { TaskService } from './task.service';

@ApiTags('待办中心 Task')
@Controller('tasks')
export class TaskController {
  constructor(private readonly svc: TaskService) {}

  @Post()
  @RequirePermissions('task:create')
  @OperationLog({ action: 'task:create', target: 'task' })
  @ApiOperation({ summary: '创建任务' })
  create(@TenantId() t: number, @Body() d: CreateTaskDto) {
    return this.svc.create(t, d);
  }

  @Get()
  @RequirePermissions('task:view')
  @ApiOperation({ summary: '任务列表(可按负责人/类型/状态过滤)' })
  list(@TenantId() t: number, @Query() q: TaskPageQueryDto) {
    return this.svc.list(t, q);
  }

  @Put(':id/complete')
  @RequirePermissions('task:update')
  @OperationLog({ action: 'task:complete', target: 'task' })
  @ApiOperation({ summary: '完成任务(如写课后点评)' })
  complete(@TenantId() t: number, @Param('id') id: number, @CurrentUser() u: AuthUser) {
    return this.svc.complete(t, Number(id), u.id);
  }

  @Delete(':id')
  @RequirePermissions('task:delete')
  @ApiOperation({ summary: '删除任务' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.remove(t, Number(id));
  }
}
