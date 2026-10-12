import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantSelfController } from './tenant-self.controller';
import { RbacModule } from '../../core/rbac/rbac.module';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), RbacModule, forwardRef(() => OrgModule)],
  providers: [TenantService],
  controllers: [TenantController, TenantSelfController],
  exports: [TenantService],
})
export class TenantModule {}
