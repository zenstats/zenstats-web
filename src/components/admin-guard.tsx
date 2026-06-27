import { Outlet } from "react-router-dom";
import Forbidden from "@/components/403";

export default function AdminGuard() {
  // 子账号即使父账号是管理员也不能访问后台
  if (localStorage.getItem("user_type") === "sub_account") {
    return <Forbidden />;
  }
  if (localStorage.getItem("is_admin") !== "true") {
    return <Forbidden />;
  }
  return <Outlet />;
}
