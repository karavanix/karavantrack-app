import { Bell, BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { Spinner } from "@/components/ui/spinner";

export function NotificationButton() {
  const { t } = useTranslation();
  const { permission, isLoading, requestPermission } = useNotifications();

  if (permission === "unsupported" || permission === "denied") return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={requestPermission}
      disabled={isLoading || permission === "granted"}
      title={
        permission === "granted"
          ? t("notifications_enabled")
          : t("notifications_enable")
      }
    >
      {isLoading ? (
        <Spinner className="h-4 w-4" />
      ) : permission === "granted" ? (
        <Bell size={18} className="text-primary" />
      ) : (
        <BellOff size={18} />
      )}
    </Button>
  );
}
