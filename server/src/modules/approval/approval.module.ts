import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalNode } from './entities/approval-node.entity';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalService } from './approval.service';
import { ApprovalFlowService } from './approval-flow.service';
import { ApprovalController } from './approval.controller';
import { TaskModule } from '../task/task.module';
import { AuditModule } from '../../core/audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../../core/rbac/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalInstance, ApprovalNode, ApprovalFlow, User]),
    TaskModule,
    AuditModule,
    NotificationModule,
  ],
  providers: [ApprovalService, ApprovalFlowService],
  controllers: [ApprovalController],
  exports: [ApprovalService, ApprovalFlowService],
})
export class ApprovalModule {}
