import { useEffect, useState } from 'react';
import {
  Card, Switch, Button, Input, Typography, Space, Tag, Popconfirm, Alert, App,
} from 'antd';
import { listNotifyChannels, upsertNotifyChannel, deleteNotifyChannel } from '../api/crm';

const { Text, Paragraph } = Typography;

interface FieldMeta { key: string; label: string; secret?: boolean; }
const CHANNEL_META: Record<string, { label: string; desc: string; fields: FieldMeta[] }> = {
  SMS_TENCENT: {
    label: '腾讯云短信',
    desc: '基于官方 API v2021-01-11 SendSms，TC3-HMAC-SHA256 签名（服务内置实现，无需额外 SDK）。填写密钥并启用即可下发。',
    fields: [
      { key: 'secretId', label: 'SecretId' },
      { key: 'secretKey', label: 'SecretKey', secret: true },
      { key: 'appId', label: 'SmsSdkAppId' },
      { key: 'signName', label: '签名' },
      { key: 'templateId', label: '模板ID' },
      { key: 'region', label: '地域(可选)' },
    ],
  },
  SMS_ALIYUN: {
    label: '阿里云短信',
    desc: '基于 RPC API SendSms(2017-05-25)，HMAC-SHA1 签名（服务内置实现）。填写密钥并启用即可下发。',
    fields: [
      { key: 'accessKeyId', label: 'AccessKeyId' },
      { key: 'accessKeySecret', label: 'AccessKeySecret', secret: true },
      { key: 'signName', label: '签名' },
      { key: 'templateCode', label: '模板CODE' },
      { key: 'region', label: '地域(可选)' },
    ],
  },
  WECHAT: {
    label: '微信公众号(预留)',
    desc: '已按微信模板消息 API 实现；实际下发还需「用户 openid 绑定」（当前系统未建模，预留）。填写密钥并启用即就绪，绑定 openid 后可立即发送。',
    fields: [
      { key: 'appId', label: 'AppId' },
      { key: 'appSecret', label: 'AppSecret', secret: true },
      { key: 'templateId', label: '模板ID' },
    ],
  },
};

type ChannelState = { enabled: boolean; fields: Record<string, string> };

export default function ChannelConfigPage() {
  const { message } = App.useApp();
  const [state, setState] = useState<Record<string, ChannelState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await listNotifyChannels();
      const map: Record<string, ChannelState> = {};
      for (const t of Object.keys(CHANNEL_META)) map[t] = { enabled: false, fields: {} };
      (list || []).forEach((c: any) => {
        map[c.type] = { enabled: !!c.enabled, fields: c.configJson || {} };
      });
      setState(map);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const setField = (type: string, key: string, val: string) =>
    setState((s) => ({ ...s, [type]: { ...s[type], fields: { ...s[type]?.fields, [key]: val } } }));

  const toggle = (type: string, val: boolean) =>
    setState((s) => ({ ...s, [type]: { ...s[type], enabled: val } }));

  const save = async (type: string) => {
    setSaving(type);
    try {
      await upsertNotifyChannel({ type, enabled: state[type].enabled, config: state[type].fields });
      message.success('已保存');
      await load();
    } catch { /* ignore */ } finally { setSaving(null); }
  };

  const remove = async (type: string) => {
    try { await deleteNotifyChannel(type); message.success('已删除'); await load(); }
    catch { /* ignore */ }
  };

  return (
    <div>
      <Alert
        type="info" showIcon
        message="外部消息渠道（§4.26 多渠道提醒）"
        description="启用渠道并在通知创建时 best-effort 补发短信/微信；任何渠道异常仅记录日志，不影响站内通知与业务。密钥仅存于本租户配置。"
        style={{ marginBottom: 16 }}
      />
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {Object.keys(CHANNEL_META).map((type) => {
          const meta = CHANNEL_META[type];
          const cs = state[type] || { enabled: false, fields: {} };
          return (
            <Card
              key={type}
              size="small"
              title={<Space>{meta.label} {cs.enabled ? <Tag color="green">已启用</Tag> : <Tag>未启用</Tag>}</Space>}
              extra={<Switch checked={cs.enabled} onChange={(v) => toggle(type, v)} />}
            >
              <Paragraph type="secondary" style={{ fontSize: 12 }}>{meta.desc}</Paragraph>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {meta.fields.map((f) => (
                  <Space key={f.key} style={{ display: 'flex' }}>
                    <Text style={{ width: 130 }}>{f.label}</Text>
                    {f.secret ? (
                      <Input.Password
                        style={{ width: 360 }}
                        placeholder={f.label}
                        value={cs.fields[f.key] || ''}
                        onChange={(e) => setField(type, f.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        style={{ width: 360 }}
                        placeholder={f.label}
                        value={cs.fields[f.key] || ''}
                        onChange={(e) => setField(type, f.key, e.target.value)}
                      />
                    )}
                  </Space>
                ))}
                <Space>
                  <Button type="primary" loading={saving === type} onClick={() => save(type)}>保存</Button>
                  <Popconfirm title="确认删除该渠道配置?" onConfirm={() => remove(type)}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                </Space>
              </Space>
            </Card>
          );
        })}
      </Space>
    </div>
  );
}
