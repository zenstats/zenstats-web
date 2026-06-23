import { defineConfig, loadEnv } from "vite";
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
    },

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
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
