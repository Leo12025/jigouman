import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertRule]),
    DashboardModule,
    NotificationModule,
  ],
  providers: [AlertService],
  controllers: [AlertController],
  exports: [AlertService],
})
export class AlertModule {}
