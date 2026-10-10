import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { SurveyService } from './survey.service';
import { CreateSurveyTemplateDto, UpdateSurveyTemplateDto, SubmitSurveyDto, SurveyPageQueryDto } from './dto/survey.dto';

@ApiTags('问卷满意度 Survey')
@Controller('surveys')
export class SurveyController {
  constructor(private readonly svc: SurveyService) {}

  @Post('templates')
  @RequirePermissions('survey:create')
  @ApiOperation({ summary: '新建问卷模板' })
  createTpl(@TenantId() t: number, @Body() d: CreateSurveyTemplateDto) { return this.svc.createTemplate(t, d); }
  @Get('templates')
  @RequirePermissions('survey:view')
  @ApiOperation({ summary: '问卷模板列表' })
  listTpl(@TenantId() t: number, @Query() q: SurveyPageQueryDto) { return this.svc.listTemplates(t, q); }
  @Get('templates/:id')
  @RequirePermissions('survey:view')
  @ApiOperation({ summary: '模板详情' })
  getTpl(@TenantId() t: number, @Param('id') id: string) { return this.svc.getTemplate(t, Number(id)); }
  @Put('templates/:id')
  @RequirePermissions('survey:update')
  @ApiOperation({ summary: '更新模板' })
  updateTpl(@TenantId() t: number, @Param('id') id: string, @Body() d: UpdateSurveyTemplateDto) { return this.svc.updateTemplate(t, Number(id), d); }
  @Delete('templates/:id')
  @RequirePermissions('survey:delete')
  @ApiOperation({ summary: '删除模板(软删)' })
  removeTpl(@TenantId() t: number, @Param('id') id: string) { return this.svc.removeTemplate(t, Number(id)); }

  @Post('submit')
  @RequirePermissions('survey:create')
  @ApiOperation({ summary: '提交问卷回收' })
  submit(@TenantId() t: number, @Body() d: SubmitSurveyDto) { return this.svc.submit(t, d); }
  @Get('responses')
  @RequirePermissions('survey:view')
  @ApiOperation({ summary: '回收列表' })
  listResp(@TenantId() t: number, @Query() q: SurveyPageQueryDto) { return this.svc.listResponses(t, q); }
  @Get('stats/:templateId')
  @RequirePermissions('survey:view')
  @ApiOperation({ summary: '问卷统计(NPS/分布)' })
  stats(@TenantId() t: number, @Param('templateId') templateId: string) { return this.svc.stats(t, Number(templateId)); }
}
