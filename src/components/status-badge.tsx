import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { LoadStatus } from "@/types";

const statusVariant: Record<
  LoadStatus,
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"
> = {
  created:      "secondary",
  assigned:     "info",
  accepted:     "info",
  picking_up:   "warning",
  picked_up:    "warning",
  in_transit:   "warning",
  // Progress toward delivery — visually distinct from "in transit" blue
  dropping_off: "warning",
  dropped_off:  "success",
  completed:    "success",
  confirmed:    "success",
  cancelled:    "destructive",
};

interface StatusBadgeProps {
  status: LoadStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const variant = statusVariant[status as LoadStatus];
  if (!variant) return <Badge variant="outline">{status}</Badge>;

  return <Badge variant={variant}>{t(`status_${status}`)}</Badge>;
}
