import {
  Controller, Post, Get, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  CreateCoursePackageDto, UpdateCoursePackageDto, AddPackageCoursesDto,
  PurchasePackageDto, CoursePackagePageQueryDto,
  SetPackageTiersDto, SetPackageItemsDto, SetPackagePriceRulesDto,
} from './dto/course-package.dto';
import { CoursePackageService } from './course-package.service';

@ApiTags('课包管理 CoursePackage')
@Controller('course-packages')
export class CoursePackageController {
  constructor(private readonly svc: CoursePackageService) {}

  @Post()
  @RequirePermissions('course-package:create')
  @OperationLog({ action: 'course-package:create', target: 'course_package' })
  @ApiOperation({ summary: '新建课包(售卖套餐)' })
  create(@TenantId() t: number, @Body() d: CreateCoursePackageDto) {
    return this.svc.create(t, d);
  }

  @Get()
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '课包列表' })
  list(@TenantId() t: number, @Query() q: CoursePackagePageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '课包详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.get(t, Number(id));
  }

  @Put(':id')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:update', target: 'course_package' })
  @ApiOperation({ summary: '编辑课包' })
  update(@TenantId() t: number, @Param('id') id: number, @Body() d: UpdateCoursePackageDto) {
    return this.svc.update(t, Number(id), d);
  }

  @Delete(':id')
  @RequirePermissions('course-package:delete')
  @OperationLog({ action: 'course-package:delete', target: 'course_package' })
  @ApiOperation({ summary: '删除课包(级联清除课程关联)' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.remove(t, Number(id));
  }

  @Post(':id/courses')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:add-courses', target: 'course_package' })
  @ApiOperation({ summary: '关联课程(可上哪些课程)' })
  addCourses(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: AddPackageCoursesDto,
  ) {
    return this.svc.addCourses(t, Number(id), d);
  }

  @Delete(':id/courses/:courseId')
  @RequirePermissions('course-package:update')
  @ApiOperation({ summary: '移除课包内课程' })
  removeCourse(
    @TenantId() t: number,
    @Param('id') id: number,
    @Param('courseId') courseId: number,
  ) {
    return this.svc.removeCourse(t, Number(id), Number(courseId));
  }

  @Get(':id/courses')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '课包含的课程' })
  courses(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.courses(t, Number(id));
  }

  @Post(':id/tiers')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:set-tiers', target: 'package_tier' })
  @ApiOperation({ summary: '设置阶梯规格(30/60课时两档,单价递减)' })
  setTiers(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: SetPackageTiersDto,
  ) {
    return this.svc.setTiers(t, Number(id), d);
  }

  @Get(':id/tiers')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '阶梯规格列表' })
  tiers(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listTiers(t, Number(id));
  }

  @Post(':id/items')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:set-items', target: 'package_item' })
  @ApiOperation({ summary: '设置组合套餐子项(每子项各自固定课时)' })
  setItems(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: SetPackageItemsDto,
  ) {
    return this.svc.setItems(t, Number(id), d);
  }

  @Get(':id/items')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '组合套餐子项列表' })
  items(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listItems(t, Number(id));
  }

  @Post(':id/price-rules')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:set-price-rules', target: 'package_price_rule' })
  @ApiOperation({ summary: '设置差异化定价(校区/老师级别/班型)' })
  setPriceRules(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: SetPackagePriceRulesDto,
  ) {
    return this.svc.setPriceRules(t, Number(id), d);
  }

  @Get(':id/price-rules')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '差异化定价列表' })
  priceRules(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.listPriceRules(t, Number(id));
  }

  @Get(':id/price')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '按维度试算价格(campusId/teacherLevel/classType)' })
  price(
    @TenantId() t: number,
    @Param('id') id: number,
    @Query('campusId') campusId?: string,
    @Query('teacherLevel') teacherLevel?: string,
    @Query('classType') classType?: string,
    @Query('audience') audience?: string,
  ) {
    return this.svc.resolvePrice(t, Number(id), { campusId, teacherLevel, classType, audience });
  }

  @Get('students/:id/returning')
  @RequirePermissions('course-package:view')
  @ApiOperation({ summary: '老生判定：存在有效订单(已支付/已完成)即为老生' })
  returning(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.isReturning(t, Number(id));
  }

  @Post(':id/purchase')
  @RequirePermissions('course-package:update')
  @OperationLog({ action: 'course-package:purchase', target: 'course_package' })
  @ApiOperation({ summary: '购课发放(套餐课时→学员课包账户)' })
  purchase(
    @TenantId() t: number,
    @Param('id') id: number,
    @Body() d: PurchasePackageDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.purchase(t, Number(id), d, u.id);
  }
}
