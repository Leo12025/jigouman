import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { CreateMaterialDto, UpdateMaterialDto, StockAdjustDto, InventoryPageQueryDto } from './dto/inventory.dto';

@ApiTags('教材库存 Inventory')
@Controller('materials')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Post()
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: '新建物料/教材' })
  create(@TenantId() t: number, @Body() d: CreateMaterialDto) { return this.svc.create(t, d); }
  @Get()
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: '物料列表' })
  list(@TenantId() t: number, @Query() q: InventoryPageQueryDto) { return this.svc.list(t, q); }
  @Get(':id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: '物料详情' })
  get(@TenantId() t: number, @Param('id') id: string) { return this.svc.get(t, Number(id)); }
  @Put(':id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: '更新物料' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateMaterialDto) { return this.svc.update(t, Number(id), d); }
  @Delete(':id')
  @RequirePermissions('inventory:delete')
  @ApiOperation({ summary: '删除物料(软删)' })
  remove(@TenantId() t: number, @Param('id') id: string) { return this.svc.remove(t, Number(id)); }

  @Post(':id/stock')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: '出入库(写流水)' })
  adjust(@TenantId() t: number, @CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: StockAdjustDto) {
    return this.svc.adjust(t, Number(id), d, u?.id);
  }
  @Get(':id/movements')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: '库存流水' })
  movements(@TenantId() t: number, @Param('id') id: string) { return this.svc.listMovements(t, Number(id)); }
}
