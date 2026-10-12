import { useEffect, useState } from 'react';
import {
  Tabs, Form, Input, Button, Descriptions, Tag, ColorPicker, Select, Switch, Typography, App,
} from 'antd';
import PageContainer from '../components/PageContainer';
import { getTenantMe, updateTenantMe } from '../api/crm';
import { useTenantConfig } from '../context/TenantConfig';
import { TENANT_FEATURES } from '../features';

/** 默认功能开关：未配置的模块一律视为开启 */
const defaultFeatures = () => {
  const f: Record<string, boolean> = {};
  TENANT_FEATURES.forEach((x) => { f[x.key] = true; });
  return f;
};

export default function TenantSettingsPage() {
  const { message } = App.useApp();
  const { reload } = useTenantConfig();
  const [form] = Form.useForm();
  const [meta, setMeta] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const t = await getTenantMe();
      setMeta(t);
      form.setFieldsValue({
        name: t.name,
        brand: { logo: '', contactPhone: '', contactEmail: '', address: '', ...(t.config?.brand || {}) },
        theme: { primaryColor: t.config?.theme?.primaryColor },
        language: t.config?.language || 'zh-CN',
        features: { ...defaultFeatures(), ...(t.config?.features || {}) },
      });
    } catch {
      // 提示由请求层统一处理
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    const v = await form.validateFields();
    // ColorPicker 回填的是 Color 实例，取 hex 字符串；空字符串表示不设置
    let primaryColor = v.theme?.primaryColor;
    if (primaryColor && typeof primaryColor === 'object' && typeof primaryColor.toHexString === 'function') {
      primaryColor = primaryColor.toHexString();
    }
    const config = {
      brand: v.brand || {},
      theme: { primaryColor: primaryColor || undefined },
      language: v.language,
      features: v.features || {},
    };
    setSaving(true);
    try {
      await updateTenantMe({ name: v.name, config });
      message.success('已保存，主题将立即生效');
      await reload();
    } catch {
      // 提示由请求层统一处理
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="机构设置"
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}
    >
      <Tabs
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
                <Form.Item name="name" label="机构名称" rules={[{ required: true, message: '请输入机构名称' }]}>
                  <Input placeholder="机构/品牌名称" />
                </Form.Item>
                <Descriptions bordered column={1} size="small" style={{ marginBottom: 8 }}>
                  <Descriptions.Item label="短码(slug)">{meta?.slug ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="访问域名">{meta?.domain || <Tag>未绑定</Tag>}</Descriptions.Item>
                  <Descriptions.Item label="状态">{meta?.status === 'ACTIVE' ? '启用' : '停用'}</Descriptions.Item>
                  <Descriptions.Item label="校区额度">{meta?.maxCampuses == null ? '不限' : meta.maxCampuses}</Descriptions.Item>
                  <Descriptions.Item label="有效期至">{meta?.expiresAt ? meta.expiresAt : '永久'}</Descriptions.Item>
                </Descriptions>
                <Typography.Paragraph type="secondary">
                  机构设置即本机构（总校区）级全局配置。校区/分校架构请在左侧「校区管理」维护；短码、域名、校区额度与有效期由平台在「租户中心」统一配置，如需变更请联系平台运营。
                </Typography.Paragraph>
              </Form>
            ),
          },
          {
            key: 'brand',
            label: '品牌与主题',
            children: (
              <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
                <Form.Item label="品牌 Logo（图片 URL）" name={['brand', 'logo']}>
                  <Input placeholder="https://example.com/logo.png" />
                </Form.Item>
                <Form.Item label="联系手机号" name={['brand', 'contactPhone']}>
                  <Input placeholder="客服/机构电话" />
                </Form.Item>
                <Form.Item label="联系邮箱" name={['brand', 'contactEmail']}>
                  <Input placeholder="service@example.com" />
                </Form.Item>
                <Form.Item label="地址" name={['brand', 'address']}>
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item label="主题色（主色）" name={['theme', 'primaryColor']} extra="留空使用默认主题色">
                  <ColorPicker />
                </Form.Item>
                <Form.Item label="界面语言" name="language">
                  <Select options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en-US', label: 'English' }]} />
                </Form.Item>
                <Typography.Paragraph type="secondary">
                  主题色保存后立即生效；语言当前应用于组件区域（antd locale），全站文案多语言将于后续版本接入。
                </Typography.Paragraph>
              </Form>
            ),
          },
          {
            key: 'features',
            label: '功能开关',
            children: (
              <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
                {TENANT_FEATURES.map((f) => (
                  <Form.Item key={f.key} name={['features', f.key]} valuePropName="checked" label={f.label}>
                    <Switch />
                  </Form.Item>
                ))}
                <Typography.Paragraph type="secondary">
                  关闭后，对应模块菜单将对本机构所有用户隐藏（默认开启）。
                </Typography.Paragraph>
              </Form>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
