import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { StorageService } from './storage/storage.service';
import { ResourceService } from './resource.service';
import { ResourceController } from './resource.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resource])],
  providers: [StorageService, ResourceService],
  controllers: [ResourceController],
  exports: [ResourceService, StorageService],
})
export class ResourceModule {}
