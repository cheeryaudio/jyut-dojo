import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Jyut Dojo render failed', error, info.componentStack);
  }

  private reload = (): void => {
    if (typeof location !== 'undefined') location.reload();
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="min-h-full bg-paper px-4 py-12">
        <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
          <div className="hero-han text-xl font-bold text-ink">应用暂时无法载入</div>
          <p className="text-sm text-tone6">请重新载入页面。你的学习进度仍保存在设备上。</p>
          <button type="button" onClick={this.reload} className="btn-primary w-full">
            重新载入
          </button>
        </div>
      </div>
    );
  }
}
