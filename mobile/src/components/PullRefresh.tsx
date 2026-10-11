import { PullToRefresh } from 'antd-mobile';

/** 下拉刷新包装：基于 window 滚动（页面用 .page 直接挂在 body 滚动，无需额外容器） */
export function PullRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
}
