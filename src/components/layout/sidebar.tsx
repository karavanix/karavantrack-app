import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck as TruckIcon,
  Settings,
  Building2,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Loads", href: "/loads", icon: Package },
  { name: "Carriers", href: "/carriers", icon: TruckIcon },
  { name: "Members", href: "/members", icon: Users },
  { name: "Company", href: "/company", icon: Building2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

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
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TruckIcon size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight">KaravanTrack</span>
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
                key={item.name}
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
          <p className="text-xs text-muted-foreground">© 2026 KaravanTrack</p>
        </div>
      </aside>
    </>
  );
}
