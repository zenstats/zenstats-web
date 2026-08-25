import { lazy } from "react";
import { Navigate } from "react-router-dom";

const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));

/** 根路径：已登录直接进站点列表；访客展示落地页（懒加载，不进首屏包）。 */
export default function RootRedirect() {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/sites" replace />;
  }
  return <LandingPage />;
}
