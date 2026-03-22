import { useEffect, useRef, useState } from "react";
import { wsClient } from "@/lib/ws-client";
import type { Position } from "@/types";

interface UseLoadPositionWSOptions {
  loadId: string | undefined;
  enabled?: boolean;
  onPosition?: (pos: Position) => void;
}

export function useLoadPositionWS({
  loadId,
  enabled = true,
  onPosition,
}: UseLoadPositionWSOptions) {
  const [isConnected, setIsConnected] = useState(wsClient.connected);
  const [lastPosition, setLastPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable ref so the subscribe callback always sees the latest onPosition
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!loadId || !enabled) return;

    // Join this load's room on the shared connection
    wsClient.join(loadId);

    // Subscribe to incoming envelopes
    const unsubscribe = wsClient.subscribe((envelope) => {
      switch (envelope.event) {
        case "join_success":
          setIsConnected(true);
          setError(null);
          break;

        case "leave_success":
          setIsConnected(false);
          break;

        case "location": {
          const d = envelope.data as Record<string, unknown> | undefined;
          if (!d || d.lat === undefined || d.lng === undefined) break;

          const pos: Position = {
            load_id: (d.load_id as string) || loadId,
            carrier_id: (d.carrier_id as string) || "",
            lat: d.lat as number,
            lng: d.lng as number,
            speed_mps: (d.speed_mps as number) ?? 0,
            heading_deg: (d.heading_deg as number) ?? 0,
            accuracy_m: (d.accuracy_m as number) ?? 0,
            recorded_at: (d.recorded_at as string) || new Date().toISOString(),
          };
          setLastPosition(pos);
          onPositionRef.current?.(pos);
          break;
        }

        case "error": {
          const d = envelope.data as Record<string, unknown> | undefined;
          const code = (d?.code as string) ?? "UNKNOWN";
          const msg = (d?.message as string) ?? "WebSocket error";
          setError(`[${code}] ${msg}`);
          break;
        }
      }
    });

    return () => {
      // Leave the room and clean up handler when leaving the page
      wsClient.leave();
      unsubscribe();
      setIsConnected(false);
      setLastPosition(null);
    };
  }, [loadId, enabled]);

  return { isConnected, lastPosition, error };
}
