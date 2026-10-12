import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { PlatformOrgController } from './platform-org.controller';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), forwardRef(() => TenantModule)],
  providers: [OrgService],
  controllers: [OrgController, PlatformOrgController],
  exports: [OrgService],
})
export class OrgModule {}
