import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import {
  PreviewUpgradeDto, CreateUpgradeDto, PackageUpgradePageQueryDto,
} from './dto/package-upgrade.dto';
import { PackageUpgradeService } from './package-upgrade.service';

@ApiTags('套餐升级 PackageUpgrade')
@Controller('package-upgrades')
export class PackageUpgradeController {
  constructor(private readonly svc: PackageUpgradeService) {}

  @Post('preview')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '升级试算：剩余课时折价后需补多少差价' })
  preview(@TenantId() t: number, @Body() d: PreviewUpgradeDto) {
    return this.svc.previewUpgrade(t, d);
  }

  @Post()
  @RequirePermissions('order:create')
  @OperationLog({ action: 'package-upgrade:create', target: 'package_upgrade' })
  @ApiOperation({ summary: '创建升级单(生成差价订单并发起审批)' })
  create(@TenantId() t: number, @Body() d: CreateUpgradeDto, @CurrentUser() u: AuthUser) {
    return this.svc.createUpgrade(t, d, u);
  }

  @Get()
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '升级单列表' })
  list(@TenantId() t: number, @Query() q: PackageUpgradePageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('order:view')
  @ApiOperation({ summary: '升级单详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.get(t, Number(id));
  }
}
