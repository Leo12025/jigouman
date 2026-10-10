import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { StaffService } from './staff.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeePageQueryDto,
  UpsertTeacherProfileDto,
  CreateCertificateDto,
  UpdateCertificateDto,
} from './dto/staff.dto';

@ApiTags('师资员工 Staff')
@Controller('employees')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Post()
  @RequirePermissions('staff:create')
  @ApiOperation({ summary: '新建员工(老师/教务/顾问/财务/运营/管理员)' })
  create(@TenantId() t: number, @Body() d: CreateEmployeeDto) {
    return this.svc.create(t, d);
  }

  @Get()
  @RequirePermissions('staff:view')
  @ApiOperation({ summary: '员工列表(按岗位/状态/关键字筛选)' })
  list(@TenantId() t: number, @Query() q: EmployeePageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('staff:view')
  @ApiOperation({ summary: '员工详情' })
  get(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.get(t, Number(id));
  }

  @Put(':id')
  @RequirePermissions('staff:update')
  @ApiOperation({ summary: '更新员工' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateEmployeeDto) {
    return this.svc.update(t, Number(id), d);
  }

  @Delete(':id')
  @RequirePermissions('staff:delete')
  @ApiOperation({ summary: '删除员工(软删)' })
  remove(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.remove(t, Number(id));
  }

  @Put(':id/teacher-profile')
  @RequirePermissions('staff:update')
  @ApiOperation({ summary: '维护师资档案(任教学科/擅长年龄段/简介/头像)' })
  upsertProfile(
    @TenantId() t: number,
    @Param('id') id: string,
    @Body() d: UpsertTeacherProfileDto,
  ) {
    return this.svc.upsertTeacherProfile(t, Number(id), d);
  }

  @Get(':id/certificates')
  @RequirePermissions('staff:view')
  @ApiOperation({ summary: '员工资质证书列表' })
  listCerts(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.listCertificates(t, Number(id));
  }

  @Post(':id/certificates')
  @RequirePermissions('staff:create')
  @ApiOperation({ summary: '新增资质证书' })
  addCert(
    @TenantId() t: number,
    @Param('id') id: string,
    @Body() d: CreateCertificateDto,
  ) {
    return this.svc.addCertificate(t, Number(id), d);
  }

  @Put('certificates/:cid')
  @RequirePermissions('staff:update')
  @ApiOperation({ summary: '更新资质证书' })
  updCert(
    @TenantId() t: number,
    @Param('cid') cid: string,
    @Body() d: UpdateCertificateDto,
  ) {
    return this.svc.updateCertificate(t, Number(cid), d);
  }

  @Delete('certificates/:cid')
  @RequirePermissions('staff:delete')
  @ApiOperation({ summary: '删除资质证书' })
  delCert(@TenantId() t: number, @Param('cid') cid: string) {
    return this.svc.removeCertificate(t, Number(cid));
  }
}
