import { useRoutes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
// import { Header } from "@/components/ui/header-1";

import routes from "./routes";
import "./App.css";

export default function App() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Header />
      <Toaster
        position="top-right"
        richColors
        toastOptions={{ className: "toaster-offset" }}
      />
      <div className="flex min-h-[calc(100vh-64px)] bg-gray-100">
        <div className="max-w-7xl w-full mx-auto">{useRoutes(routes)}</div>
      </div>
    </div>
  );
}
