import {
  Controller, Get, Put, Post, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { NotifyPageQueryDto } from './dto/notification.dto';
import { UpsertChannelConfigDto } from './dto/channel-config.dto';
import { NotificationService } from './notification.service';
import { ChannelConfigService } from './channel-config.service';

@ApiTags('通知 Notification')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly svc: NotificationService,
    private readonly channelSvc: ChannelConfigService,
  ) {}

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

  // ---------------- 外部消息渠道配置（§4.26 多渠道提醒） ----------------
  @Get('channels')
  @RequirePermissions('notification:view')
  @ApiOperation({ summary: '外部渠道配置列表(按租户)' })
  listChannels(@TenantId() t: number) {
    return this.channelSvc.list(t);
  }

  @Put('channels')
  @RequirePermissions('notification:update')
  @ApiOperation({ summary: '新增/更新渠道配置(启用并填密钥即用)' })
  upsertChannel(@TenantId() t: number, @Body() d: UpsertChannelConfigDto) {
    return this.channelSvc.upsert(t, d);
  }

  @Delete('channels/:type')
  @RequirePermissions('notification:update')
  @ApiOperation({ summary: '删除渠道配置' })
  removeChannel(@TenantId() t: number, @Param('type') type: string) {
    return this.channelSvc.remove(t, type);
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
