import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrgService],
  controllers: [OrgController],
  exports: [OrgService],
})
export class OrgModule {}
