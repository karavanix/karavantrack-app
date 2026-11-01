import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { captureAttribution } from "@/lib/attribution";
import { loadCounterScripts, pageView } from "@/lib/analytics";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import TelegramCallbackPage from "@/pages/telegram-callback";
import DashboardPage from "@/pages/dashboard";
import CreateCompanyPage from "@/pages/create-company";
import CompanySettingsPage from "@/pages/company-settings";
import MembersPage from "@/pages/members";
import CarriersPage from "@/pages/carriers";
import LoadDetailPage from "@/pages/load-detail";
import ProfilePage from "@/pages/profile";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import DeleteAccountPage from "@/pages/delete-account";
import InvitePage from "@/pages/invite";
import PublicTrackingPage from "@/pages/public-tracking";

/**
 * Counters and the visit's source. On mount: remembers the utm marks of the address (sent later
 * with the registration) and schedules the counters' scripts for after `load`. On every route
 * change: one page view to both counters, with the URL cleaned of tokens (see `publicPath`).
 */
function Analytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    captureAttribution();
    if (document.readyState === "complete") {
      loadCounterScripts();
      return;
    }
    window.addEventListener("load", loadCounterScripts, { once: true });
    return () => window.removeEventListener("load", loadCounterScripts);
  }, []);

  useEffect(() => {
    pageView(pathname, search);
  }, [pathname, search]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/telegram/callback" element={<TelegramCallbackPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/track/:token" element={<PublicTrackingPage />} />

        {/* Protected routes */}
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/loads" element={<DashboardPage />} />
          <Route path="/loads/new" element={<Navigate to="/" replace />} />
          <Route path="/loads/:id" element={<LoadDetailPage />} />
          <Route path="/carriers" element={<CarriersPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/company" element={<CompanySettingsPage />} />
          <Route path="/company/new" element={<CreateCompanyPage />} />
          <Route path="/settings" element={<ProfilePage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
