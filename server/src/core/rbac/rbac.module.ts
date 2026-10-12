import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Membership } from './membership.entity';
import { RbacService } from './rbac.service';
import { UserController, RoleController, PermissionController } from './rbac.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, Membership])],
  providers: [RbacService],
  controllers: [UserController, RoleController, PermissionController],
  exports: [RbacService],
})
export class RbacModule {}
