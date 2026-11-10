import { defineConfig, loadEnv, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const dataDomain = env.VITE_DATA_DOMAIN || "localhost";

  return {
    server: {
      host: "0.0.0.0",
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: false,
        },
      },
    },

    // 强制转为顶层 vite 的 PluginOption[]：pnpm 会给 @tailwindcss/vite 装一份嵌套的 vite，
    // 其 Plugin 类型与顶层 vite@7.0.3 名义不同（同版本、不同安装路径），导致 tsc -b 报 TS2769。
    // 运行时无差异，仅是类型 nominal 冲突，故此处做一次显式转换。
    plugins: [
      react(),
      tsconfigPaths(),
      tailwindcss(),
      {
        name: "inject-data-domain",
        transformIndexHtml(html) {
          // 开发模式：直接替换为环境变量值
          // 生产构建：保留占位符 __DATA_DOMAIN__，由容器 entrypoint 在启动时替换
          if (mode === "development") {
            return html.replace("__DATA_DOMAIN__", dataDomain);
          }
          return html;
        },
      },
    ] as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // 强制所有依赖（react-router-dom / recharts / radix 等）使用项目根下的同一份 React。
      // 曾出现 pnpm 目录中 react-router-dom 携带独立 react 副本的情况，导致 dev 下
      // "Invalid hook call / useRef of null" 白屏；dedupe 让这类安装异常不再影响运行。
      dedupe: ["react", "react-dom"],
    },
    build: {
      rollupOptions: {
        output: {
          // 供应商分包：只对"各页面都用到"的库(react 核心、radix)单独成块以利缓存。
          // recharts / react-grid-layout 仅被懒加载的统计/漏斗页使用，不在此手动分块——
          // 让 Vite 把它们并入对应的按需 chunk，避免在首屏被 modulepreload 提前下载。
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@radix-ui")) return "radix";
            if (/[\\/]react[\\/]|[\\/]react-dom[\\/]|[\\/]react-router/.test(id)) return "react-vendor";
          },
        },
      },
    },
  };
});
