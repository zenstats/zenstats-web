import { Outlet, Navigate } from "react-router-dom";

export default function EmailGuard() {
  const token = localStorage.getItem("token");
  const userType = localStorage.getItem("user_type");
  const emailVerified = localStorage.getItem("email_verified") === "true";
  const isAdmin = localStorage.getItem("is_admin") === "true";

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 子账号不需要邮箱验证
  if (userType === "sub_account") {
    return <Outlet />;
  }

  if (!emailVerified && !isAdmin) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <Outlet />;
}
