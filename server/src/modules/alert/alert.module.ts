import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule])],
  providers: [AlertService],
  controllers: [AlertController],
  exports: [AlertService],
})
export class AlertModule {}
