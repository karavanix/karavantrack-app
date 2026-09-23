import { useTranslation } from "react-i18next";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionStatus } from "@/types";

const VARIANT_BY_STATE = {
  live: "success",
  economy: "info",
  disconnected: "secondary",
  gps_disabled: "warning",
} as const;

const LABEL_KEY_BY_STATE = {
  live: "load_detail_conn_live",
  economy: "load_detail_conn_economy",
  disconnected: "load_detail_conn_disconnected",
  gps_disabled: "load_detail_conn_gps_disabled",
} as const;

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus | null;
}

// Replaces the old binary "Live"/offline badge, which only ever reflected
// this browser's own WebSocket connection — never whether the driver's
// phone was actually reachable and streaming GPS. Renders nothing for
// not_started, same as the old isTrackable gate.
export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { t } = useTranslation();

  if (!status || status.state === "not_started") return null;

  const variant = VARIANT_BY_STATE[status.state];
  const labelKey = LABEL_KEY_BY_STATE[status.state];

  return (
    <Badge variant={variant} className="gap-1">
      <Radio size={10} className={status.state === "live" ? "animate-pulse" : ""} />
      {t(labelKey)}
    </Badge>
  );
}
