import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { MapPin, Navigation, Calendar } from "lucide-react";
import type { Load } from "@/types";
import { utcToLocalDateDisplay } from "@/lib/date-utils";

interface LoadCardProps {
  load: Load;
  carrierMap: Record<string, string>;
  onQuickView?: (loadId: string) => void;
}

export function LoadCard({ load, carrierMap, onQuickView }: LoadCardProps) {
  const navigate = useNavigate();

  const carrierName = load.carrier_id ? (carrierMap[load.carrier_id] ?? null) : null;

  const truncate = (str: string, max = 36) =>
    str.length > max ? str.slice(0, max) + "…" : str;

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-200 active:scale-[0.99]"
      onClick={() => onQuickView ? onQuickView(load.id) : navigate(`/loads/${load.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title + Reference */}
        <div>
          <p className="font-semibold text-sm leading-tight line-clamp-2">{load.title}</p>
          {load.reference_id && (
            <code className="text-[10px] text-muted-foreground">#{load.reference_id}</code>
          )}
        </div>

        {/* Status badge */}
        <StatusBadge status={load.status} />

        {/* Carrier */}
        {carrierName && (
          <p className="text-xs text-muted-foreground truncate">👤 {carrierName}</p>
        )}

        {/* Route */}
        <div className="space-y-0.5">
          {load.pickup_address && (
            <div className="flex items-start gap-1">
              <Navigation size={10} className="text-green-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                {truncate(load.pickup_address)}
              </p>
            </div>
          )}
          {load.dropoff_address && (
            <div className="flex items-start gap-1">
              <MapPin size={10} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                {truncate(load.dropoff_address)}
              </p>
            </div>
          )}
        </div>

        {/* Pickup datetime */}
        {load.pickup_at && (
          <div className="flex items-center gap-1">
            <Calendar size={10} className="text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground">{utcToLocalDateDisplay(load.pickup_at)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
