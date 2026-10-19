import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupBuyActivity } from './entities/group-buy-activity.entity';
import { GroupBuyTeam } from './entities/group-buy-team.entity';
import { GroupBuyMember } from './entities/group-buy-member.entity';
import { GroupBuyTier } from './entities/group-buy-tier.entity';
import { GroupBuyShowoff } from './entities/group-buy-showoff.entity';
import { GroupBuySquad } from './entities/group-buy-squad.entity';
import { ActivityEvent } from './entities/activity-event.entity';
import { MarketingMaterial } from './entities/marketing-material.entity';
import { Order } from '../order/entities/order.entity';
import { HourAccount } from '../hour/entities/hour-account.entity';
import { Distributor } from '../distribution/entities/distributor.entity';
import { Commission } from '../distribution/entities/commission.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { GroupBuyService } from './groupbuy.service';
import { GroupBuyController } from './groupbuy.controller';
import { GroupBuyPublicController } from './groupbuy-public.controller';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupBuyActivity, GroupBuyTeam, GroupBuyMember, GroupBuyTier,
      GroupBuyShowoff, GroupBuySquad, ActivityEvent, MarketingMaterial,
      // 交易闭环：参团生成订单、成团发课时
      Order, HourAccount,
      // 拼团 × 分销：成团后按一/二级比例入账佣金
      Distributor, Commission,
      // 合规阈值按租户可配
      Tenant,
    ]),
    OrderModule,
  ],
  providers: [GroupBuyService],
  controllers: [GroupBuyController, GroupBuyPublicController],
  exports: [GroupBuyService],
})
export class GroupBuyModule {}
