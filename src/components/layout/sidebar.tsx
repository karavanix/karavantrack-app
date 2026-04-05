import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompanyStore } from "@/stores/company-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck as TruckIcon,
  Settings,
  Building2,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { hasPermission } = useCompanyStore();

  const allNavItems = [
    { name: t("nav_dashboard"), href: "/", icon: LayoutDashboard, permission: null },
    { name: t("nav_loads"), href: "/loads", icon: Package, permission: "company.load.read" as const },
    { name: t("nav_carriers"), href: "/carriers", icon: TruckIcon, permission: "company.carrier.read" as const },
    { name: t("nav_members"), href: "/members", icon: Users, permission: "company.member.read" as const },
    { name: t("nav_company"), href: "/company", icon: Building2, permission: null },
    { name: t("nav_settings"), href: "/settings", icon: Settings, permission: null },
  ];

  // Filter nav items based on permissions (items with null permission are always shown)
  const navigation = allNavItems.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo wordmark: [logo]ool */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Y" className="h-8 w-8 shrink-0" />
            <span className="text-xl font-bold tracking-tight -ml-0.5">ool</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon size={18} className={cn(isActive && "text-primary")} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-muted-foreground">{t("copyright")}</p>
        </div>
      </aside>
    </>
  );
}
