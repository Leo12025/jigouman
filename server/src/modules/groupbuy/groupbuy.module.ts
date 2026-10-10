import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupBuyActivity } from './entities/group-buy-activity.entity';
import { GroupBuyTeam } from './entities/group-buy-team.entity';
import { GroupBuyMember } from './entities/group-buy-member.entity';
import { GroupBuyService } from './groupbuy.service';
import { GroupBuyController } from './groupbuy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GroupBuyActivity, GroupBuyTeam, GroupBuyMember])],
  providers: [GroupBuyService],
  controllers: [GroupBuyController],
  exports: [GroupBuyService],
})
export class GroupBuyModule {}
