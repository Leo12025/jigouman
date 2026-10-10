import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { OrgService } from './org.service';
import { CreateOrgDto, UpdateOrgDto, OrgPageQueryDto } from './dto/org.dto';

@ApiTags('多校区组织 Org')
@Controller('orgs')
export class OrgController {
  constructor(private readonly svc: OrgService) {}

  @Post()
  @RequirePermissions('org:create')
  @ApiOperation({ summary: '新建组织(总部/分校/校区)' })
  create(@TenantId() t: number, @Body() d: CreateOrgDto) { return this.svc.create(t, d); }

  @Get()
  @RequirePermissions('org:view')
  @ApiOperation({ summary: '组织列表(扁平)' })
  list(@TenantId() t: number, @Query() q: OrgPageQueryDto) { return this.svc.list(t, q); }

  @Get('tree')
  @RequirePermissions('org:view')
  @ApiOperation({ summary: '组织树' })
  tree(@TenantId() t: number) { return this.svc.tree(t); }

  @Get(':id')
  @RequirePermissions('org:view')
  @ApiOperation({ summary: '组织详情' })
  get(@TenantId() t: number, @Param('id') id: string) { return this.svc.get(t, Number(id)); }

  @Put(':id')
  @RequirePermissions('org:update')
  @ApiOperation({ summary: '更新组织' })
  update(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateOrgDto) { return this.svc.update(t, Number(id), d); }

  @Delete(':id')
  @RequirePermissions('org:delete')
  @ApiOperation({ summary: '删除组织(需无下级)' })
  remove(@TenantId() t: number, @Param('id') id: string) { return this.svc.remove(t, Number(id)); }
}
