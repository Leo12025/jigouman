import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { MembershipService } from './membership.service';
import {
  CreateMemberLevelDto, UpdateMemberLevelDto, AdjustPointsDto, MemberPageQueryDto,
} from './dto/membership.dto';

@ApiTags('积分会员 Membership')
@Controller('membership')
export class MembershipController {
  constructor(private readonly svc: MembershipService) {}

  @Post('levels')
  @RequirePermissions('member:create')
  @ApiOperation({ summary: '新建会员等级' })
  createLevel(@TenantId() t: number, @Body() d: CreateMemberLevelDto) {
    return this.svc.createLevel(t, d);
  }
  @Get('levels')
  @RequirePermissions('member:view')
  @ApiOperation({ summary: '会员等级列表' })
  listLevels(@TenantId() t: number) {
    return this.svc.listLevels(t);
  }
  @Put('levels/:id')
  @RequirePermissions('member:update')
  @ApiOperation({ summary: '更新等级' })
  updateLevel(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateMemberLevelDto) {
    return this.svc.updateLevel(t, Number(id), d);
  }
  @Delete('levels/:id')
  @RequirePermissions('member:delete')
  @ApiOperation({ summary: '删除等级(软删)' })
  removeLevel(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.removeLevel(t, Number(id));
  }

  @Get('members')
  @RequirePermissions('member:view')
  @ApiOperation({ summary: '会员列表' })
  list(@TenantId() t: number, @Query() q: MemberPageQueryDto) {
    return this.svc.listMembers(t, q);
  }
  @Get('members/:studentId')
  @RequirePermissions('member:view')
  @ApiOperation({ summary: '会员详情(自动建档)' })
  get(@TenantId() t: number, @Param('studentId') studentId: string) {
    return this.svc.getMember(t, Number(studentId));
  }
  @Post('members/:studentId/points')
  @RequirePermissions('member:update')
  @ApiOperation({ summary: '调整积分(正数发放/负数扣减，自动升级)' })
  adjust(@TenantId() t: number, @Param('studentId') studentId: string, @Body() d: AdjustPointsDto) {
    return this.svc.adjustPoints(t, { ...d, studentId: Number(studentId) });
  }
  @Get('members/:studentId/ledger')
  @RequirePermissions('member:view')
  @ApiOperation({ summary: '积分流水' })
  ledger(@TenantId() t: number, @Param('studentId') studentId: string) {
    return this.svc.listLedger(t, Number(studentId));
  }
}
