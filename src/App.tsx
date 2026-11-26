import { Suspense } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import { ConfirmProvider } from "@/components/confirm-provider";
import ErrorBoundary from "@/components/error-boundary";

import routes from "./routes";
import "./App.css";

export default function App() {
  const location = useLocation();
  const isStandalone =
    location.pathname === "/" ||
    location.pathname.startsWith("/docs") ||
    location.pathname.startsWith("/share/");

  return (
    <ConfirmProvider>
      <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
        {!isStandalone && <Header />}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ className: isStandalone ? "" : "toaster-offset" }}
        />
        <main className={isStandalone ? "flex-1 w-full" : "flex-1 w-full"}>
          <div className={isStandalone ? "w-full" : "max-w-7xl w-full mx-auto"}>
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
                  </div>
                }
              >
                {useRoutes(routes)}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
