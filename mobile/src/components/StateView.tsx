import { DotLoading, Button } from 'antd-mobile';

interface Props {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  children?: React.ReactNode;
}

/** 统一加载/错误态（空态由各页面自行渲染，保持业务文案一致） */
export default function StateView({ loading, error, onRetry, children }: Props) {
  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 14 }}>
        <DotLoading /> 加载中…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ color: '#999', marginBottom: 12, fontSize: 14 }}>加载失败</div>
        <Button color="primary" fill="none" onClick={onRetry}>
          点击重试
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
