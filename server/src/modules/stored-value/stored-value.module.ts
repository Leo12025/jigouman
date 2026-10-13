import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredValueAccount } from './entities/stored-value-account.entity';
import { StoredValueLedger } from './entities/stored-value-ledger.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { StoredValueService } from './stored-value.service';
import { StoredValueController } from './stored-value.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoredValueAccount, StoredValueLedger, Tenant]),
  ],
  providers: [StoredValueService],
  controllers: [StoredValueController],
  exports: [StoredValueService],
})
export class StoredValueModule {}
