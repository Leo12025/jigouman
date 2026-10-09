import { createHmac, createHash } from 'crypto';

/**
 * 腾讯云短信发送（§4.26 多渠道提醒）：基于官方 API v2021-01-11 SendSms。
 * 使用 TC3-HMAC-SHA256 签名，纯 Node crypto + fetch 实现，无需额外 SDK。
 * 管理员在「消息渠道配置」填写 secretId/secretKey/appId/signName/templateId 后即可使用。
 */
export interface TencentSmsOptions {
  secretId: string;
  secretKey: string;
  appId: string;
  signName: string;
  templateId: string;
  region?: string;
  phone: string;
  /** 模板参数（与控制台模板占位符顺序一致） */
  params: string[];
}

const HOST = 'sms.tencentcloudapi.com';
const SERVICE = 'sms';
const ACTION = 'SendSms';
const VERSION = '2021-01-11';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}
function hmacHex(key: string | Buffer, data: string): string {
  return hmac(key, data).toString('hex');
}

export async function tencentSmsSend(opts: TencentSmsOptions): Promise<any> {
  const region = opts.region || 'ap-guangzhou';
  const phoneNumber = opts.phone.startsWith('+') ? opts.phone : `+86${opts.phone}`;
  const payloadObj = {
    PhoneNumberSet: [phoneNumber],
    SmsSdkAppId: opts.appId,
    SignName: opts.signName,
    TemplateId: opts.templateId,
    TemplateParamSet: opts.params,
    SessionContext: '',
  };
  const payload = JSON.stringify(payloadObj);
  const algorithm = 'TC3-HMAC-SHA256';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const hashedPayload = sha256Hex(payload);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\n`;
  const signedHeaders = 'content-type;host';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
  const credentialScope = `${date}/${region}/${SERVICE}/tc3_request`;
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const secretDate = hmac(`TC3${opts.secretKey}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = hmacHex(secretSigning, stringToSign);

  const authorization =
    `${algorithm} Credential=${opts.secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${HOST}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Host: HOST,
      'X-TC-Action': ACTION,
      'X-TC-Version': VERSION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
      Authorization: authorization,
    },
    body: payload,
  });
  const json: any = await res.json();
  if (json?.Response?.Error) {
    const e = json.Response.Error;
    throw new Error(`Tencent SMS error: ${e.Code} ${e.Message}`);
  }
  return json;
}
