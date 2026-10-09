import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { ChannelConfig } from './entities/channel-config.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ChannelConfigService } from './channel-config.service';
import { ExternalChannelService } from './external-channel.service';
import { User } from '../../core/rbac/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, ChannelConfig, User])],
  providers: [NotificationService, ChannelConfigService, ExternalChannelService],
  controllers: [NotificationController],
  exports: [NotificationService, ExternalChannelService],
})
export class NotificationModule {}
