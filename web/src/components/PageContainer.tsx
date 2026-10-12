import type { ReactNode } from 'react';
import { Typography, theme } from 'antd';

interface Props {
  /** 页面标题，留空则不显示标题栏 */
  title?: ReactNode;
  /** 标题栏右侧操作区（按钮等） */
  extra?: ReactNode;
  /** 是否用 Card 风格容器包裹内容，默认 true */
  card?: boolean;
  children: ReactNode;
}

/**
 * 统一页面容器：提供一致的「标题 + 右侧操作 + 内容卡片」结构，
 * 颜色/圆角全部取自 antd 主题 token，避免业务代码硬编码。
 */
export default function PageContainer({ title, extra, card = true, children }: Props) {
  const { token } = theme.useToken();
  return (
    <div>
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {title && <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>}
          {extra}
        </div>
      )}
      {card ? (
        <div
          style={{
            background: token.colorBgContainer,
            padding: 16,
            borderRadius: token.borderRadiusLG,
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
