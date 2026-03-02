import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, ChevronDown, LogOut, User, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { companies, selectedCompanyId, selectCompany } = useCompanyStore();

  const currentCompany = companies.find((c) => c.id === selectedCompanyId);
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-sm lg:px-6">
      {/* Left: Mobile menu + Company selector */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </Button>

        {/* Company selector */}
        {companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-sm font-medium">
                <Building2 size={16} className="text-primary" />
                {currentCompany?.name ?? "Select company"}
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Your companies</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => selectCompany(company.id)}
                  className={
                    company.id === selectedCompanyId
                      ? "bg-accent font-medium"
                      : ""
                  }
                >
                  <Building2 size={14} />
                  {company.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/company/new")}>
                + Create new company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">
              {user?.first_name} {user?.last_name}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <User size={14} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut size={14} />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
