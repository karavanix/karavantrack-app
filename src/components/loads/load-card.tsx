import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { MapPin, Navigation, Calendar, User } from "lucide-react";
import type { Load } from "@/types";
import { utcToLocalDateDisplay } from "@/lib/date-utils";
import { truncate } from "@/lib/string-utils";

interface LoadCardProps {
  load: Load;
  carrierMap: Record<string, string>;
  onQuickView?: (loadId: string) => void;
}

export function LoadCard({ load, carrierMap, onQuickView }: LoadCardProps) {
  const navigate = useNavigate();

  const carrierName = load.carrier_id ? (carrierMap[load.carrier_id] ?? null) : null;

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
          <div className="flex items-center gap-1">
            <User size={11} className="text-muted-foreground shrink-0" aria-hidden />
            <p className="text-xs text-muted-foreground truncate">{carrierName}</p>
          </div>
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
