import { createHmac } from 'crypto';

/**
 * 阿里云短信发送（§4.26 多渠道提醒）：基于 RPC API SendSms(2017-05-25)。
 * 使用 HMAC-SHA1 签名，纯 Node crypto + fetch 实现，无需额外 SDK。
 * 管理员在「消息渠道配置」填写 accessKeyId/accessKeySecret/signName/templateCode 后即可使用。
 */
export interface AliyunSmsOptions {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  region?: string;
  phone: string;
  /** 模板参数（JSON 对象，与控制台模板变量名一致） */
  templateParam: Record<string, string>;
}

const HOST = 'dysmsapi.aliyuncs.com';

/** 阿里云规范编码：除 A-Za-z0-9-_.~ 外全部百分号编码（含 !*'() 与空格） */
function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/%7E/g, '~');
}

export async function aliyunSmsSend(opts: AliyunSmsOptions): Promise<any> {
  const region = opts.region || 'cn-hangzhou';
  const params: Record<string, string> = {
    AccessKeyId: opts.accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: opts.phone,
    RegionId: region,
    SignName: opts.signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: Math.random().toString(36).slice(2) + Date.now(),
    SignatureVersion: '1.0',
    TemplateCode: opts.templateCode,
    TemplateParam: JSON.stringify(opts.templateParam),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  };

  const sortedKeys = Object.keys(params).sort();
  const canonical = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  const stringToSign =
    'GET&' + percentEncode('/') + '&' + percentEncode(canonical);
  const signature = createHmac('sha1', opts.accessKeySecret + '&')
    .update(stringToSign, 'utf8')
    .digest('base64');
  params.Signature = signature;

  const url =
    `https://${HOST}/?` +
    Object.keys(params)
      .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
      .join('&');

  const res = await fetch(url);
  const json: any = await res.json();
  if (json?.Code && json.Code !== 'OK') {
    throw new Error(`Aliyun SMS error: ${json.Code} ${json.Message}`);
  }
  return json;
}
