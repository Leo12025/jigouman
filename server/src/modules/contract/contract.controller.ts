import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { ContractService } from './contract.service';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
  CreateContractDto,
  SignContractDto,
  ContractPageQueryDto,
} from './dto/contract.dto';

@ApiTags('合同电子签 Contract')
@Controller('contracts')
export class ContractController {
  constructor(private readonly svc: ContractService) {}

  // ---- 模板 ----
  @Post('templates')
  @RequirePermissions('contract:create')
  @ApiOperation({ summary: '新建合同模板' })
  createTpl(@TenantId() t: number, @Body() d: CreateContractTemplateDto) {
    return this.svc.createTemplate(t, d);
  }
  @Get('templates')
  @RequirePermissions('contract:view')
  @ApiOperation({ summary: '合同模板列表' })
  listTpl(@TenantId() t: number, @Query() q: ContractPageQueryDto) {
    return this.svc.listTemplates(t, q);
  }
  @Get('templates/:id')
  @RequirePermissions('contract:view')
  @ApiOperation({ summary: '模板详情' })
  getTpl(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.getTemplate(t, Number(id));
  }
  @Put('templates/:id')
  @RequirePermissions('contract:update')
  @ApiOperation({ summary: '更新模板' })
  updateTpl(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateContractTemplateDto) {
    return this.svc.updateTemplate(t, Number(id), d);
  }
  @Delete('templates/:id')
  @RequirePermissions('contract:delete')
  @ApiOperation({ summary: '删除模板(软删)' })
  removeTpl(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.removeTemplate(t, Number(id));
  }

  // ---- 合同实例 ----
  @Post()
  @RequirePermissions('contract:create')
  @ApiOperation({ summary: '创建合同(草稿)' })
  create(@TenantId() t: number, @Body() d: CreateContractDto) {
    return this.svc.createContract(t, d);
  }
  @Get()
  @RequirePermissions('contract:view')
  @ApiOperation({ summary: '合同列表' })
  list(@TenantId() t: number, @Query() q: ContractPageQueryDto) {
    return this.svc.listContracts(t, q);
  }
  @Get(':id')
  @RequirePermissions('contract:view')
  @ApiOperation({ summary: '合同详情(含存证链)' })
  get(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.getContract(t, Number(id));
  }
  @Post(':id/sign')
  @RequirePermissions('contract:update')
  @ApiOperation({ summary: '电子签署(实名+手写签名+存证)' })
  sign(@TenantId() t: number, @Param('id') id: string, @Body() d: SignContractDto) {
    return this.svc.sign(t, Number(id), d);
  }
  @Post(':id/invalidate')
  @RequirePermissions('contract:update')
  @ApiOperation({ summary: '作废合同' })
  invalidate(@TenantId() t: number, @Param('id') id: string, @Body() d: { reason?: string }) {
    return this.svc.invalidate(t, Number(id), d?.reason);
  }
}
