import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { CouponService } from './coupon.service';
import {
  CreateCouponTemplateDto,
  UpdateCouponTemplateDto,
  GrantCouponDto,
  CouponPageQueryDto,
  PreviewRedeemDto,
  RedeemCouponDto,
  CalcPromotionDto,
} from './dto/coupon.dto';

@ApiTags('优惠券 Coupon')
@Controller('coupons')
export class CouponController {
  constructor(private readonly svc: CouponService) {}

  // ---- 模板管理 ----
  @Post('templates')
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: '新建优惠券模板' })
  createTpl(@TenantId() t: number, @Body() d: CreateCouponTemplateDto) {
    return this.svc.createTemplate(t, d);
  }

  @Get('templates')
  @RequirePermissions('coupon:view')
  @ApiOperation({ summary: '优惠券模板列表' })
  listTpl(@TenantId() t: number, @Query() q: CouponPageQueryDto) {
    return this.svc.listTemplates(t, q);
  }

  @Get('templates/:id')
  @RequirePermissions('coupon:view')
  @ApiOperation({ summary: '模板详情' })
  getTpl(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.getTemplate(t, Number(id));
  }

  @Put('templates/:id')
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: '更新模板' })
  updateTpl(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateCouponTemplateDto) {
    return this.svc.updateTemplate(t, Number(id), d);
  }

  @Delete('templates/:id')
  @RequirePermissions('coupon:delete')
  @ApiOperation({ summary: '删除模板(软删)' })
  removeTpl(@TenantId() t: number, @Param('id') id: string) {
    return this.svc.removeTemplate(t, Number(id));
  }

  // ---- 发放 / 持有 / 核销 ----
  @Post('grant')
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: '发放优惠券到学员(校验库存/限领)' })
  grant(@TenantId() t: number, @Body() d: GrantCouponDto) {
    return this.svc.grant(t, d);
  }

  @Get()
  @RequirePermissions('coupon:view')
  @ApiOperation({ summary: '学员持有券列表' })
  list(@TenantId() t: number, @Query() q: CouponPageQueryDto) {
    return this.svc.listGrants(t, q);
  }

  @Post('preview')
  @RequirePermissions('coupon:view')
  @ApiOperation({ summary: '预览抵扣金额(不核销)' })
  preview(@TenantId() t: number, @Body() d: PreviewRedeemDto) {
    return this.svc.preview(t, d.code, Number(d.amount), d.courseId);
  }

  @Post('calc')
  @RequirePermissions('coupon:view')
  @ApiOperation({ summary: '促销试算引擎(全场活动+券码叠加/互斥/满减/买赠/限时特价)' })
  calc(@TenantId() t: number, @Body() d: CalcPromotionDto) {
    return this.svc.calcPromotion(t, d);
  }

  @Post('redeem')
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: '核销优惠券并抵扣订单金额' })
  redeem(@TenantId() t: number, @Body() d: RedeemCouponDto) {
    return this.svc.redeem(t, d.code, d.orderId, Number(d.amount), d.courseId);
  }
}
