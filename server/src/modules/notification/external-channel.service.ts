import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/rbac/user.entity';
import { ChannelConfigService } from './channel-config.service';
import { tencentSmsSend } from './providers/tencent-sms.provider';
import { aliyunSmsSend } from './providers/aliyun-sms.provider';
import { wechatTemplateSend } from './providers/wechat.provider';

import { orgRepo } from '../../common/org-scope';

export interface ExternalPushPayload {
  title: string;
  content?: string;
  type: string;
}

/**
 * 外部渠道触达（§4.26 多渠道提醒）：当租户启用短信/微信渠道且用户具备联系方式时，
 * 在站内通知创建后 best-effort 补发外部消息。任何渠道失败均只记日志、不影响站内通知与业务。
 */
@Injectable()
export class ExternalChannelService {
  private readonly logger = new Logger(ExternalChannelService.name);

  private readonly userRepo: Repository<User>;
  constructor(
    @InjectRepository(User) userRepo: Repository<User>,
    private readonly configSvc: ChannelConfigService,
  ) {
    this.userRepo = orgRepo(userRepo);
  }

  async pushExternal(tenantId: number, userId: number, payload: ExternalPushPayload) {
    const user = await this.userRepo.findOne({ where: { tenantId, id: userId } as any });
    if (!user) return;
    const channels = await this.configSvc.listActive(tenantId);
    for (const c of channels) {
      try {
        const cfg = c.configJson || {};
        if (c.type === 'SMS_TENCENT' && user.phone) {
          await tencentSmsSend({
            secretId: cfg.secretId, secretKey: cfg.secretKey, appId: cfg.appId,
            signName: cfg.signName, templateId: cfg.templateId, region: cfg.region,
            phone: user.phone, params: [payload.title, payload.content || ''],
          });
          this.logger.log(`Tencent SMS sent to ${user.phone} for ${payload.type}`);
        } else if (c.type === 'SMS_ALIYUN' && user.phone) {
          await aliyunSmsSend({
            accessKeyId: cfg.accessKeyId, accessKeySecret: cfg.accessKeySecret,
            signName: cfg.signName, templateCode: cfg.templateCode, region: cfg.region,
            phone: user.phone, templateParam: { title: payload.title, content: payload.content || '' },
          });
          this.logger.log(`Aliyun SMS sent to ${user.phone} for ${payload.type}`);
        } else if (c.type === 'WECHAT') {
          // 预留：当前系统未建模微信 openid，无法定位接收人，跳过下发。
          // 配置 appId/appSecret/templateId 已就绪，绑定 openid 后即可改为实际发送。
          this.logger.warn(`WECHAT channel active but openid binding not implemented; skip for ${payload.type}`);
        }
      } catch (e: any) {
        this.logger.error(`external channel ${c.type} failed: ${e?.message || e}`);
      }
    }
  }
}
