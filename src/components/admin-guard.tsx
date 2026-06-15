import { Outlet } from "react-router-dom";
import Forbidden from "@/components/403";

export default function AdminGuard() {
  if (localStorage.getItem("is_admin") !== "true") {
    return <Forbidden />;
  }
  return <Outlet />;
}
