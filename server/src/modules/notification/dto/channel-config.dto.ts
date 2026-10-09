import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpsertChannelConfigDto {
  @IsIn(['SMS_TENCENT', 'SMS_ALIYUN', 'WECHAT'])
  type: 'SMS_TENCENT' | 'SMS_ALIYUN' | 'WECHAT';

  @IsOptional() @IsBoolean() enabled?: boolean;

  @IsOptional() @IsString() name?: string;

  /** 渠道参数（密钥/签名/模板等）。结构随 type 不同：
   *  SMS_TENCENT: { secretId, secretKey, appId, signName, templateId, region? }
   *  SMS_ALIYUN : { accessKeyId, accessKeySecret, signName, templateCode, region? }
   *  WECHAT      : { appId, appSecret, templateId }（实际发送还需用户 openid 绑定，当前预留） */
  @IsOptional() config?: Record<string, any>;
}
