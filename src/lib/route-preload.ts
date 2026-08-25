// 路由 chunk 预取入口。与 routes.tsx 中的 lazy() 使用同一个 import()，
// 浏览器/Vite 会复用同一模块请求，因此提前调用即等于预热对应 chunk。
export const preloadStats = () => import("@/pages/sites/stats/stats");
