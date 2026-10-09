import {
  Controller, Post, Get, Delete, Param, Query, Req, UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, AuthUser, TenantId } from '../../common/decorators/auth.decorator';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ResCode } from '../../common/constants/response-code';
import { ResourceService } from './resource.service';
import { UploadedFile } from './storage/storage-driver.interface';
import { UploadQueryDto, ResourcePageQueryDto } from './dto/resource.dto';

@ApiTags('统一资源 Resource')
@Controller('resources')
export class ResourceController {
  constructor(private readonly svc: ResourceService) {}

  @Post('upload')
  @UseInterceptors(AnyFilesInterceptor())
  @RequirePermissions('resource:upload')
  @ApiOperation({ summary: '上传文件(支持多文件,字段名 files/file),统一本地/OSS 管理' })
  upload(
    @TenantId() t: number,
    @CurrentUser() u: AuthUser,
    @Req() req: any,
    @Query() q: UploadQueryDto,
  ) {
    const files: UploadedFile[] = req.files || [];
    if (!files.length) throw new BusinessException(ResCode.BAD_REQUEST, '未接收到文件');
    return this.svc.upload(t, files, {
      ownerId: u.id,
      category: q.category,
      refType: q.refType,
      refId: q.refId,
    });
  }

  @Get()
  @RequirePermissions('resource:view')
  @ApiOperation({ summary: '资源列表(按分类/关联/类型筛选)' })
  list(@TenantId() t: number, @Query() q: ResourcePageQueryDto) {
    return this.svc.list(t, q);
  }

  @Get(':id')
  @RequirePermissions('resource:view')
  @ApiOperation({ summary: '资源详情' })
  get(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.get(t, Number(id));
  }

  @Delete(':id')
  @RequirePermissions('resource:delete')
  @ApiOperation({ summary: '删除资源(软删+清理存储)' })
  remove(@TenantId() t: number, @Param('id') id: number) {
    return this.svc.remove(t, Number(id));
  }
}
