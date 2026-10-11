import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelConfig } from './entities/channel-config.entity';
import { UpsertChannelConfigDto } from './dto/channel-config.dto';

/** 外部消息渠道配置服务（§4.26 多渠道提醒：按租户/渠道管理密钥与启停） */
import { orgRepo } from '../../common/org-scope';

@Injectable()
export class ChannelConfigService {
  private readonly repo: Repository<ChannelConfig>;
  constructor(
    @InjectRepository(ChannelConfig)
    repo: Repository<ChannelConfig>,
  ) {
    this.repo = orgRepo(repo);
  }

  list(tenantId: number) {
    return this.repo.find({ where: { tenantId } as any, order: { id: 'DESC' } as any });
  }

  getActive(tenantId: number, type: string) {
    return this.repo.findOne({ where: { tenantId, type, enabled: 1 } as any });
  }

  listActive(tenantId: number) {
    return this.repo.find({ where: { tenantId, enabled: 1 } as any });
  }

  /** 按 type 创建或更新（每种渠道至多一条） */
  async upsert(tenantId: number, d: UpsertChannelConfigDto) {
    const exist = await this.repo.findOne({ where: { tenantId, type: d.type } as any });
    if (exist) {
      exist.enabled = d.enabled === false ? 0 : 1;
      if (d.name !== undefined) exist.name = d.name;
      if (d.config !== undefined) exist.configJson = d.config;
      return this.repo.save(exist as any);
    }
    const created = this.repo.create({
      tenantId,
      type: d.type,
      enabled: d.enabled === false ? 0 : 1,
      name: d.name,
      configJson: d.config,
    } as ChannelConfig);
    return this.repo.save(created as any);
  }

  async remove(tenantId: number, type: string) {
    const exist = await this.repo.findOne({ where: { tenantId, type } as any });
    if (!exist) throw new NotFoundException('渠道配置不存在');
    await this.repo.remove(exist as any);
    return { type };
  }
}
