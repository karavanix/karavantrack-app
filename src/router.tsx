import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import CreateCompanyPage from "@/pages/create-company";
import CompanySettingsPage from "@/pages/company-settings";
import MembersPage from "@/pages/members";
import CarriersPage from "@/pages/carriers";
import CreateLoadPage from "@/pages/create-load";
import LoadDetailPage from "@/pages/load-detail";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/loads" element={<DashboardPage />} />
          <Route path="/loads/new" element={<CreateLoadPage />} />
          <Route path="/loads/:id" element={<LoadDetailPage />} />
          <Route path="/carriers" element={<CarriersPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/company" element={<CompanySettingsPage />} />
          <Route path="/company/new" element={<CreateCompanyPage />} />
          <Route path="/settings" element={<PlaceholderPage title="Profile Settings" />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}
