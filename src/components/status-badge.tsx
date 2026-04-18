import { Badge } from "@/components/ui/badge";
import type { LoadStatus } from "@/types";

const statusConfig: Record<LoadStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  created: { label: "Created", variant: "secondary" },
  assigned: { label: "Assigned", variant: "info" },
  accepted: { label: "Accepted", variant: "info" },
  picking_up: { label: "Picking Up", variant: "warning" },
  picked_up: { label: "Picked Up", variant: "warning" },
  in_transit: { label: "In Transit", variant: "warning" },
  dropping_off: { label: "Dropping Off", variant: "info" },
  dropped_off: { label: "Dropped Off", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  confirmed: { label: "Confirmed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

interface StatusBadgeProps {
  status: LoadStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as LoadStatus] ?? {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
