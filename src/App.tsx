import { Suspense } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import { ConfirmProvider } from "@/components/confirm-provider";
// import { Header } from "@/components/ui/header-1";

import routes from "./routes";
import "./App.css";

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <ConfirmProvider>
      <div className="flex flex-col min-h-screen w-full">
        {!isLanding && <Header />}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ className: "toaster-offset" }}
        />
        <div className={`flex min-h-[calc(100vh-64px)] ${isLanding ? "" : "bg-gray-100 dark:bg-gray-950"}`}>
          <div className={`${isLanding ? "" : "max-w-7xl"} w-full mx-auto`}>
            <Suspense fallback={<div className="flex items-center justify-center h-[60vh] text-sm text-muted-foreground">…</div>}>
              {useRoutes(routes)}
            </Suspense>
          </div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
