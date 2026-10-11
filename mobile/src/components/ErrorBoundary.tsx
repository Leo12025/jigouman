import React from 'react';
import { Button } from 'antd-mobile';

interface State {
  hasError: boolean;
  msg: string;
}

/** 全局渲染崩溃兜底：任意页面抛错时显示统一错误页，避免整树卸载白屏 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, msg: '' };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, msg: error?.message || '未知错误' };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }

  private retry = () => this.setState({ hasError: false, msg: '' });
  private backHome = () => {
    window.location.hash = '#/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            color: '#666',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>页面出错了</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 16, maxWidth: 300, textAlign: 'center' }}>
            {this.state.msg}
          </div>
          <Button color="primary" onClick={this.retry}>
            重试
          </Button>
          <Button fill="none" style={{ marginTop: 8 }} onClick={this.backHome}>
            返回登录
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
