/**
 * 微信公众号模板消息发送（§4.26 多渠道提醒，当前为预留通道）。
 * 管理员在「消息渠道配置」填写 appId/appSecret/templateId 后启用；
 * 实际下发还需【用户 openid 绑定】（当前系统未建模微信 openid，故无 openid 时跳过发送）。
 * 接口已按微信官方 API 实现，绑定 openid 后即可直接使用。access_token 此处为演示性获取，
 * 生产应做全局缓存（微信限制 2000 次/日获取），后续接入时补充缓存层。
 */
export interface WechatTemplateOptions {
  appId: string;
  appSecret: string;
  templateId: string;
  openid: string;
  data: Record<string, { value: string }>;
}

export async function wechatTemplateSend(opts: WechatTemplateOptions): Promise<any> {
  const tokenRes = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${opts.appId}&secret=${opts.appSecret}`,
  );
  const token: any = await tokenRes.json();
  if (!token?.access_token) {
    throw new Error(`WeChat access_token failed: ${token?.errmsg || 'unknown'}`);
  }
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token.access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: opts.openid,
        template_id: opts.templateId,
        data: opts.data,
      }),
    },
  );
  const json: any = await res.json();
  if (json?.errcode && json.errcode !== 0) {
    throw new Error(`WeChat template send error: ${json.errcode} ${json.errmsg}`);
  }
  return json;
}
