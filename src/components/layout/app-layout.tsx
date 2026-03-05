import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingScreen } from "@/components/ui/spinner";
import { wsClient } from "@/lib/ws-client";

export function AppLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, fetchMe, user } = useAuthStore();
  const { fetchCompanies } = useCompanyStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    const init = async () => {
      try {
        if (!user) {
          await fetchMe();
        }
        await fetchCompanies();
      } catch {
        // Token may be invalid
        navigate("/login", { replace: true });
        return;
      } finally {
        setInitializing(false);
      }

      // Open the shared WS connection once the session is ready
      const token = useAuthStore.getState().accessToken;
      if (token) wsClient.connect(token);
    };

    init();

    // Disconnect WS when the layout unmounts (i.e. user logs out)
    return () => wsClient.disconnect();
  }, []);

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingScreen message="Loading your workspace..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
