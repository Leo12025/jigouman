import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalNode } from './entities/approval-node.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { TaskModule } from '../task/task.module';
import { AuditModule } from '../../core/audit/audit.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalInstance, ApprovalNode]),
    TaskModule,
    AuditModule,
    NotificationModule,
  ],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
