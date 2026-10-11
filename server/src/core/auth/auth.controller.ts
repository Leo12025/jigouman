import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, minutes } from '@nestjs/throttler';
import { Public, CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { LoginDto, RefreshDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@ApiTags('鉴权 Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  @Post('login')
  @ApiOperation({ summary: '账号密码登录（签发 access/refresh 双令牌）' })
  login(@Body() dto: LoginDto, @TenantId() t: number) {
    return this.authService.login(dto, t);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: minutes(1) } })
  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('profile')
  @ApiOperation({ summary: '当前用户信息(含机构/角色/权限点)' })
  profile(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    return this.authService.profile(t, u.id);
  }

  @Public()
  @Post('wechat/login')
  @ApiOperation({ summary: '管理员微信登录(code换openid，需已绑定)' })
  wechatLogin(@Body() d: { code: string }) {
    return this.authService.wechatLogin(d.code);
  }

  @Public()
  @Post('wechat/bind')
  @ApiOperation({ summary: '管理员微信绑定并登录(绑定到当前租户手机号账号)' })
  wechatBind(@TenantId() t: number, @Body() d: { code: string; phone: string }) {
    return this.authService.wechatBind(t, d.code, d.phone);
  }
}
