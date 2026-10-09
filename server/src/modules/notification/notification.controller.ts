import {
  Controller, Get, Put, Param, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { NotifyPageQueryDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('通知 Notification')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: '我的通知列表(可按未读过滤)' })
  list(@TenantId() t: number, @CurrentUser() u: AuthUser, @Query() q: NotifyPageQueryDto) {
    return this.svc.list(t, u.id, q);
  }

  @Get('unread-count')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: '未读数量' })
  unreadCount(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    return this.svc.unreadCount(t, u.id).then((count) => ({ count }));
  }

  @Put(':id/read')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: '标记单条已读' })
  markRead(@TenantId() t: number, @CurrentUser() u: AuthUser, @Param('id') id: number) {
    return this.svc.markRead(t, u.id, id);
  }

  @Put('read-all')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: '全部标记已读' })
  markAll(@TenantId() t: number, @CurrentUser() u: AuthUser) {
    return this.svc.markAllRead(t, u.id);
  }
}
