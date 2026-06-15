import { Outlet, Navigate } from "react-router-dom";

export default function EmailGuard() {
  const token = localStorage.getItem("token");
  const emailVerified = localStorage.getItem("email_verified") === "true";
  const isAdmin = localStorage.getItem("is_admin") === "true";

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!emailVerified && !isAdmin) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <Outlet />;
}
