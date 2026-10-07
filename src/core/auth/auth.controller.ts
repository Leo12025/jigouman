import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@ApiTags('鉴权 Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '账号密码登录（签发 JWT）' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
