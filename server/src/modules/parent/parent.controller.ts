import {
  Controller, Post, Get, Delete, Param, Body, ForbiddenException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId, Public } from '../../common/decorators/auth.decorator';
import { SendOtpDto, ParentLoginDto, BindStudentDto } from './dto/parent.dto';
import { ParentService } from './parent.service';

@ApiTags('家长端 Parent(H5)')
@Controller('parents')
export class ParentController {
  constructor(private readonly svc: ParentService) {}

  @Public()
  @Post('otp')
  @ApiOperation({ summary: '发送短信验证码(非生产环境返回 code 便于联调)' })
  otp(@Body() d: SendOtpDto) {
    return this.svc.sendOtp(d);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '手机号+OTP 登录/注册(§6.23)' })
  login(@Body() d: ParentLoginDto) {
    const tenantId = d.tenantId ?? (Number(process.env.DEFAULT_TENANT_ID) || 0);
    return this.svc.login(tenantId, d);
  }

  @Post('bind')
  @ApiOperation({ summary: '绑定学员(多对多)' })
  bind(@TenantId() t: number, @CurrentUser() u: AuthUser, @Body() d: BindStudentDto) {
    this.assertParent(u);
    return this.svc.bind(t, u.phone as string, d);
  }

  @Delete('bind/:id')
  @ApiOperation({ summary: '解绑学员(保留历史)' })
  unbind(@TenantId() t: number, @CurrentUser() u: AuthUser, @Param('id') id: number) {
    this.assertParent(u);
    return this.svc.unbind(t, u.phone as string, Number(id));
  }

  @Get('students')
  @ApiOperation({ summary: '我的学员(多对多)' })
  students(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    this.assertParent(u);
    return this.svc.myStudents(t, u.phone as string);
  }

  @Get('lessons')
  @ApiOperation({ summary: '我的课表(按绑定学员班级)' })
  lessons(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    this.assertParent(u);
    return this.svc.myLessons(t, u.phone as string);
  }

  @Get('homeworks')
  @ApiOperation({ summary: '我的作业(含提交状态)' })
  homeworks(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    this.assertParent(u);
    return this.svc.myHomeworks(t, u.phone as string);
  }

  @Get('reviews')
  @ApiOperation({ summary: '我的点评(绑定学员的课后点评)' })
  reviews(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    this.assertParent(u);
    return this.svc.myReviews(t, u.phone as string);
  }

  /** 家长端接口仅允许家长身份访问 */
  private assertParent(u: AuthUser) {
    if (u?.kind !== 'parent' || !u.phone) {
      throw new ForbiddenException('请使用家长账号访问');
    }
  }
}
