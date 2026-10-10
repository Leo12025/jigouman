import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { TeachingService } from './teaching.service';
import { CreateOnlineClassDto, UpdateOnlineClassDto, CreateStudyRecordDto, TeachingPageQueryDto } from './dto/teaching.dto';

@ApiTags('在线课堂/督学 Teaching')
@Controller('teaching')
export class TeachingController {
  constructor(private readonly svc: TeachingService) {}

  @Post('classes')
  @RequirePermissions('teaching:create')
  @ApiOperation({ summary: '创建在线课堂' })
  createClass(@TenantId() t: number, @Body() d: CreateOnlineClassDto) { return this.svc.createClass(t, d); }

  @Get('classes')
  @RequirePermissions('teaching:view')
  @ApiOperation({ summary: '课堂列表' })
  listClass(@TenantId() t: number, @Query() q: TeachingPageQueryDto) { return this.svc.listClasses(t, q); }

  @Get('classes/:id')
  @RequirePermissions('teaching:view')
  @ApiOperation({ summary: '课堂详情' })
  getClass(@TenantId() t: number, @Param('id') id: string) { return this.svc.getClass(t, Number(id)); }

  @Put('classes/:id')
  @RequirePermissions('teaching:update')
  @ApiOperation({ summary: '更新课堂' })
  updateClass(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateOnlineClassDto) { return this.svc.updateClass(t, Number(id), d); }

  @Post('classes/:id/start')
  @RequirePermissions('teaching:update')
  @ApiOperation({ summary: '开始直播' })
  startClass(@TenantId() t: number, @Param('id') id: string) { return this.svc.startClass(t, Number(id)); }

  @Post('classes/:id/end')
  @RequirePermissions('teaching:update')
  @ApiOperation({ summary: '结束课堂' })
  endClass(@TenantId() t: number, @Param('id') id: string) { return this.svc.endClass(t, Number(id)); }

  @Delete('classes/:id')
  @RequirePermissions('teaching:delete')
  @ApiOperation({ summary: '删除课堂(软删)' })
  removeClass(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeClass(t, Number(id)); }

  @Post('study')
  @RequirePermissions('teaching:create')
  @ApiOperation({ summary: '督学打卡(记录出勤)' })
  recordStudy(@TenantId() t: number, @Body() d: CreateStudyRecordDto) { return this.svc.recordStudy(t, d); }

  @Get('study')
  @RequirePermissions('teaching:view')
  @ApiOperation({ summary: '出勤记录(按课堂)' })
  listStudy(@TenantId() t: number, @Query('classId') classId: string) { return this.svc.listStudy(t, Number(classId)); }

  @Get('study/stats/:classId')
  @RequirePermissions('teaching:view')
  @ApiOperation({ summary: '出勤统计' })
  stats(@TenantId() t: number, @Param('classId') classId: string) { return this.svc.stats(t, Number(classId)); }
}
