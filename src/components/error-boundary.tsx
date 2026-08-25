import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "@/i18n";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

const RELOAD_FLAG = "zenstats-chunk-reload";

/** 懒加载 chunk 在发版后 hash 变化导致 404/解析失败时抛出的错误特征。 */
function isChunkLoadError(error: Error): boolean {
  const msg = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
}

/**
 * 全局错误边界：
 * - 懒加载 chunk 失败（通常是发版后旧页面引用了已不存在的 hash 文件）→ 自动整页刷新一次；
 * - 其他渲染错误 → 展示可重试的错误提示，而不是整页白屏。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!reloaded) sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        /* ignore */
      }
      if (!reloaded) {
        window.location.reload();
        return;
      }
    }
    console.error("Unhandled render error:", error, info.componentStack);
  }

  componentDidUpdate(_: Props, prev: State) {
    if (prev.error && !this.state.error) {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-4">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {i18n.t("common.renderErrorTitle", { defaultValue: "Something went wrong" })}
        </div>
        <div className="text-sm text-muted-foreground max-w-md break-words">{error.message}</div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={this.reset}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {i18n.t("common.retry", { defaultValue: "Retry" })}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 hover:opacity-90"
          >
            {i18n.t("common.reload", { defaultValue: "Reload page" })}
          </button>
        </div>
      </div>
    );
  }
}
