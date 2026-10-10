import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { VenueService } from './venue.service';
import { CreateClassroomDto, UpdateClassroomDto, ClassroomPageQueryDto } from './dto/venue.dto';

@ApiTags('教室场地 Venue')
@Controller('classrooms')
export class VenueController {
  constructor(private readonly svc: VenueService) {}

  @Post()
  @RequirePermissions('venue:create')
  @ApiOperation({ summary: '新建教室/场地' })
  create(@TenantId() t: number, @Body() d: CreateClassroomDto) {
    return this.svc.create(t, d);
  }

  @Get()
  @RequirePermissions('venue:view')
  @ApiOperation({ summary: '教室列表(按类型/状态/关键字筛选)' })
  list(@TenantId() t: number, @Query() q: ClassroomPageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('venue:view')
  @ApiOperation({ summary: '教室详情' })
  get(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.get(t, Number(id));
  }

  @Put(':id')
  @RequirePermissions('venue:update')
  @ApiOperation({ summary: '更新教室' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateClassroomDto) {
    return this.svc.update(t, Number(id), d);
  }

  @Delete(':id')
  @RequirePermissions('venue:delete')
  @ApiOperation({ summary: '删除教室(软删)' })
  remove(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.remove(t, Number(id));
  }
}
