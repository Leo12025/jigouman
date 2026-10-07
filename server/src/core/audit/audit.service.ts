import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuthUser } from '../../common/decorators/auth.decorator';

export interface AuditInput {
  user: AuthUser;
  action: string;
  target?: string;
  bizId?: number;
  method?: string;
  path?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: AuditInput): Promise<void> {
    const log = this.repo.create({
      tenantId: input.user.tenantId,
      operatorId: input.user.id,
      operatorName: input.user.username,
      action: input.action,
      target: input.target,
      bizId: input.bizId,
      method: input.method,
      path: input.path,
      before: input.before,
      after: input.after,
      ip: input.ip,
    });
    await this.repo.save(log);
  }
}
